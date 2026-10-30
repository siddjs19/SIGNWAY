const { randomBytes } = require('node:crypto');
const {
  Contract,
  FetchRequest,
  JsonRpcProvider,
  Wallet,
  getAddress,
  keccak256,
  toUtf8Bytes,
} = require('ethers');
const Credential = require('../models/Credential');
const Lesson = require('../models/Lesson');
const LessonCompletion = require('../models/LessonCompletion');
const Progress = require('../models/Progress');
const registryArtifact = require('../blockchain/abi/CredentialRegistry.json');

const COURSE_ID = 'isl-learning-path';
const ACHIEVEMENT_NAME = 'ISL Learning Path Completed';
const TARGET_CHAIN_ID = 54635;

class CredentialBlockchainError extends Error {
  constructor(code, message, status = 503) {
    super(message);
    this.name = 'CredentialBlockchainError';
    this.code = code;
    this.status = status;
  }
}

function getConfiguration() {
  const rpcUrl = process.env.MST_RPC_URL || 'https://coralrpc.mstblockchain.com/';
  const chainId = Number(process.env.MST_CHAIN_ID || 54635);
  const contractAddress = process.env.MST_CREDENTIAL_CONTRACT_ADDRESS;
  const privateKey = process.env.MST_ISSUER_PRIVATE_KEY;
  const explorerUrl = process.env.MST_EXPLORER_URL || 'https://coral.mstscan.com/';
  const timeoutMs = Number(process.env.MST_RPC_TIMEOUT_MS || 15000);

  if (!Number.isSafeInteger(chainId) || chainId !== TARGET_CHAIN_ID) {
    throw new CredentialBlockchainError(
      'MST_CHAIN_ID_INVALID',
      `Credential registry only supports MST Coral Testnet (chain ${TARGET_CHAIN_ID}).`,
      500,
    );
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
    throw new CredentialBlockchainError('MST_RPC_TIMEOUT_INVALID', 'MST RPC timeout must be between 1000 and 60000 milliseconds.', 500);
  }
  if (!contractAddress || !privateKey) {
    throw new CredentialBlockchainError(
      'CREDENTIAL_BLOCKCHAIN_NOT_CONFIGURED',
      'Credential issuance is unavailable until the Coral contract and backend issuer are configured.',
      503,
    );
  }

  try {
    return {
      rpcUrl,
      chainId,
      timeoutMs,
      contractAddress: getAddress(contractAddress),
      privateKey,
      explorerUrl: new URL(explorerUrl).origin,
    };
  } catch {
    throw new CredentialBlockchainError(
      'CREDENTIAL_BLOCKCHAIN_CONFIGURATION_INVALID',
      'Credential blockchain configuration is invalid.',
      500,
    );
  }
}

async function createConnectedRuntime({ signing = false } = {}) {
  const configuration = getConfiguration();
  const connection = new FetchRequest(configuration.rpcUrl);
  connection.timeout = configuration.timeoutMs;
  const provider = new JsonRpcProvider(connection);
  let actualNetwork;
  try {
    actualNetwork = await provider.getNetwork();
  } catch {
    throw new CredentialBlockchainError(
      'MST_RPC_UNAVAILABLE',
      'Could not connect to the configured MST RPC.',
      503,
    );
  }
  validateNetworkChainId(actualNetwork.chainId, configuration.chainId);

  let signer;
  if (signing) {
    try {
      signer = new Wallet(configuration.privateKey, provider);
    } catch {
      throw new CredentialBlockchainError(
        'CREDENTIAL_ISSUER_KEY_INVALID',
        'Backend issuer key configuration is invalid.',
        500,
      );
    }
  }
  const contract = new Contract(
    configuration.contractAddress,
    registryArtifact.abi,
    signer || provider,
  );
  return { configuration, provider, signer, contract };
}

function canonicalizeCredential({ credentialId, courseId, issuedAt }) {
  return JSON.stringify({
    schema: 'signbridge.learning-credential.v1',
    credentialId,
    courseId,
    achievement: ACHIEVEMENT_NAME,
    issuedAt: new Date(issuedAt).toISOString(),
  });
}

function hashCanonicalCredential(canonicalCredential) {
  return keccak256(toUtf8Bytes(canonicalCredential));
}

function validateNetworkChainId(actualChainId, expectedChainId) {
  if (Number(actualChainId) !== Number(expectedChainId)) {
    throw new CredentialBlockchainError(
      'MST_CHAIN_ID_MISMATCH',
      `Configured chain ${expectedChainId} does not match RPC chain ${actualChainId}.`,
      503,
    );
  }
}

function validateCredentialNetwork(record, configuration) {
  if (
    Number(record.networkChainId) !== configuration.chainId
    || record.contractAddress.toLowerCase() !== configuration.contractAddress.toLowerCase()
  ) {
    throw new CredentialBlockchainError(
      'CREDENTIAL_NETWORK_MISMATCH',
      'Credential belongs to a different MST network or registry contract.',
      409,
    );
  }
}

async function getEligibility(learnerId) {
  const [lessons, completions, progress] = await Promise.all([
    Lesson.find({ published: true }).select('_id').lean(),
    LessonCompletion.find({ user: learnerId }).select('lesson').lean(),
    Progress.findOne({ user: learnerId }).select('achievements').lean(),
  ]);
  const completed = new Set(completions.map((record) => String(record.lesson?._id || record.lesson)));
  const eligible = lessons.length > 0
    && lessons.every((lesson) => completed.has(String(lesson._id)))
    && progress?.achievements?.includes(ACHIEVEMENT_NAME) === true;

  return {
    eligible,
    achievement: ACHIEVEMENT_NAME,
    courseId: COURSE_ID,
    completedLessons: lessons.filter((lesson) => completed.has(String(lesson._id))).length,
    totalLessons: lessons.length,
    reason: eligible
      ? null
      : 'Complete all currently published lessons to unlock the existing ISL Learning Path Completed milestone.',
  };
}

async function getLearnerCredentials(learnerId) {
  return Credential.find({ learnerId }).sort({ createdAt: -1 }).lean();
}

async function issueCredentialRecord(record) {
  const runtime = await createConnectedRuntime({ signing: true });
  validateCredentialNetwork(record, runtime.configuration);
  const chainCredential = await runtime.contract.verifyCredential(record.credentialId);
  if (chainCredential.exists) {
    return reconcileCredential(record);
  }

  let transaction;
  try {
    transaction = await runtime.contract.issueCredential(record.credentialId, record.credentialHash);
  } catch {
    throw new CredentialBlockchainError(
      'CREDENTIAL_ISSUANCE_SUBMISSION_FAILED',
      'The issuer transaction could not be submitted. No confirmed credential was created.',
      502,
    );
  }
  await Credential.updateOne(
    { _id: record._id },
    { $set: { transactionHash: transaction.hash, status: 'pending' } },
  );
  return Credential.findById(record._id).lean();
}

async function reconcileCredential(record, runtimeOverride = null) {
  if (
    !record.canonicalCredential
    || hashCanonicalCredential(record.canonicalCredential) !== record.credentialHash
  ) {
    throw new CredentialBlockchainError(
      'CREDENTIAL_HASH_MISMATCH',
      'Stored canonical credential does not match its recorded hash.',
      500,
    );
  }
  const runtime = runtimeOverride || await createConnectedRuntime();
  validateCredentialNetwork(record, runtime.configuration);
  const chainCredential = await runtime.contract.verifyCredential(record.credentialId);
  if (!chainCredential.exists || chainCredential.credentialHash.toLowerCase() !== record.credentialHash) {
    if (record.transactionHash) {
      const receipt = await runtime.provider.getTransactionReceipt(record.transactionHash);
      if (receipt && receipt.status === 0) {
        await Credential.updateOne({ _id: record._id }, { $set: { status: 'failed' } });
        return Credential.findById(record._id).lean();
      }
    }
    return record;
  }

  if (chainCredential.issuer.toLowerCase() !== record.issuerAddress) {
    throw new CredentialBlockchainError(
      'CREDENTIAL_CHAIN_MISMATCH',
      'On-chain issuer does not match the stored credential issuer.',
      502,
    );
  }

  if (!record.transactionHash) return record;
  let revocationReceipt = null;
  if (chainCredential.revoked) {
    if (!record.revocationTransactionHash) return record;
    revocationReceipt = await runtime.provider.getTransactionReceipt(record.revocationTransactionHash);
    if (!revocationReceipt || revocationReceipt.status !== 1) return record;
  }
  const receipt = record.transactionHash
    ? await runtime.provider.getTransactionReceipt(record.transactionHash)
    : null;
  if (record.transactionHash && !receipt) return record;
  if (receipt && receipt.status !== 1) {
    await Credential.updateOne({ _id: record._id }, { $set: { status: 'failed' } });
    return Credential.findById(record._id).lean();
  }

  const updates = {
    status: chainCredential.revoked ? 'revoked' : 'issued',
    issuedAt: new Date(Number(chainCredential.issuedAt) * 1000),
    ...(receipt ? { blockNumber: receipt.blockNumber } : {}),
  };
  if (revocationReceipt) {
    const revocationBlock = await runtime.provider.getBlock(revocationReceipt.blockNumber);
    if (revocationBlock) updates.revokedAt = new Date(Number(revocationBlock.timestamp) * 1000);
  }
  await Credential.updateOne({ _id: record._id }, { $set: updates });
  return Credential.findById(record._id).lean();
}

async function verifyPublicCredential(credentialId) {
  if (!/^0x[0-9a-f]{64}$/i.test(credentialId)) {
    throw new CredentialBlockchainError('INVALID_CREDENTIAL_ID', 'Credential ID must be a 32-byte hex value.', 400);
  }
  const record = await Credential.findOne({ credentialId: credentialId.toLowerCase() })
    .select('+canonicalCredential')
    .lean();
  if (!record) return { exists: false };
  if (
    !record.canonicalCredential
    || hashCanonicalCredential(record.canonicalCredential) !== record.credentialHash
  ) {
    throw new CredentialBlockchainError(
      'CREDENTIAL_HASH_MISMATCH',
      'Stored canonical credential does not match its recorded hash.',
      502,
    );
  }

  const runtime = await createConnectedRuntime();
  validateCredentialNetwork(record, runtime.configuration);
  const chainCredential = await runtime.contract.verifyCredential(record.credentialId);
  if (!chainCredential.exists || chainCredential.credentialHash.toLowerCase() !== record.credentialHash) {
    return {
      exists: false,
      verified: false,
      status: record.status,
      networkChainId: runtime.configuration.chainId,
    };
  }
  if (chainCredential.issuer.toLowerCase() !== record.issuerAddress) {
    throw new CredentialBlockchainError(
      'CREDENTIAL_CHAIN_MISMATCH',
      'On-chain credential data does not match its stored issuer.',
      502,
    );
  }

  const receipt = record.transactionHash
    ? await runtime.provider.getTransactionReceipt(record.transactionHash)
    : null;
  if (!receipt || receipt.status !== 1) {
    return {
      exists: true,
      verified: false,
      status: record.status === 'failed' ? 'failed' : 'pending',
      credentialId: record.credentialId,
      credentialHash: record.credentialHash,
      transactionHash: record.transactionHash,
      revocationTransactionHash: record.revocationTransactionHash,
      networkChainId: runtime.configuration.chainId,
    };
  }
  const revocationReceipt = chainCredential.revoked && record.revocationTransactionHash
    ? await runtime.provider.getTransactionReceipt(record.revocationTransactionHash)
    : null;
  if (chainCredential.revoked && (!revocationReceipt || revocationReceipt.status !== 1)) {
    return {
      exists: true,
      verified: false,
      status: 'pending',
      credentialId: record.credentialId,
      credentialHash: record.credentialHash,
      transactionHash: record.transactionHash,
      revocationTransactionHash: record.revocationTransactionHash,
      networkChainId: runtime.configuration.chainId,
    };
  }

  const status = chainCredential.revoked ? 'revoked' : 'issued';
  const issuedAt = new Date(Number(chainCredential.issuedAt) * 1000);
  const revocationBlock = revocationReceipt
    ? await runtime.provider.getBlock(revocationReceipt.blockNumber)
    : null;
  const revokedAt = revocationBlock ? new Date(Number(revocationBlock.timestamp) * 1000) : null;
  await Credential.updateOne(
    { _id: record._id },
    { $set: { status, issuedAt, revokedAt, blockNumber: receipt.blockNumber } },
  );

  return {
    exists: true,
    verified: !chainCredential.revoked,
    status,
    credentialId: record.credentialId,
    credentialHash: record.credentialHash,
    issuerAddress: chainCredential.issuer,
    issuedAt,
    revokedAt,
    transactionHash: record.transactionHash,
    blockNumber: receipt.blockNumber,
    contractAddress: runtime.configuration.contractAddress,
    networkChainId: runtime.configuration.chainId,
    explorerUrl: runtime.configuration.explorerUrl,
  };
}

async function revokeCredential(record) {
  const runtime = await createConnectedRuntime({ signing: true });
  validateCredentialNetwork(record, runtime.configuration);
  const existing = await runtime.contract.verifyCredential(record.credentialId);
  if (!existing.exists || existing.credentialHash.toLowerCase() !== record.credentialHash) {
    throw new CredentialBlockchainError(
      'CREDENTIAL_NOT_FOUND_ON_CHAIN',
      'Credential does not match an issued on-chain record.',
      409,
    );
  }
  if (existing.revoked) {
    if (!record.revocationTransactionHash) {
      throw new CredentialBlockchainError(
        'CREDENTIAL_REVOCATION_UNCONFIRMED',
        'The registry reports a revocation but its transaction cannot be confirmed from the stored record.',
        502,
      );
    }
    const receipt = await runtime.provider.getTransactionReceipt(record.revocationTransactionHash);
    if (!receipt || receipt.status !== 1) {
      throw new CredentialBlockchainError(
        'CREDENTIAL_REVOCATION_UNCONFIRMED',
        'The revocation transaction is not confirmed yet.',
        503,
      );
    }
    const block = await runtime.provider.getBlock(receipt.blockNumber);
    const revokedAt = block ? new Date(Number(block.timestamp) * 1000) : null;
    await Credential.updateOne(
      { _id: record._id },
      { $set: { status: 'revoked', revokedAt } },
    );
    return Credential.findById(record._id).lean();
  }

  let transaction;
  try {
    transaction = await runtime.contract.revokeCredential(record.credentialId);
    await Credential.updateOne(
      { _id: record._id },
      { $set: { revocationTransactionHash: transaction.hash } },
    );
    const receipt = await transaction.wait(1);
    if (!receipt || receipt.status !== 1) {
      throw new Error('Revocation transaction was not confirmed.');
    }
    const verified = await runtime.contract.verifyCredential(record.credentialId);
    if (!verified.revoked) throw new Error('Contract did not confirm credential revocation.');
    const block = await runtime.provider.getBlock(receipt.blockNumber);
    await Credential.updateOne(
      { _id: record._id },
      {
        $set: {
          status: 'revoked',
          revokedAt: block ? new Date(Number(block.timestamp) * 1000) : null,
        },
      },
    );
  } catch (error) {
    if (error instanceof CredentialBlockchainError) throw error;
    throw new CredentialBlockchainError(
      'CREDENTIAL_REVOCATION_FAILED',
      'Revocation was not confirmed on-chain. Check the transaction before retrying.',
      502,
    );
  }
  return Credential.findById(record._id).lean();
}

function createCredentialId() {
  return `0x${randomBytes(32).toString('hex')}`;
}

module.exports = {
  ACHIEVEMENT_NAME,
  COURSE_ID,
  TARGET_CHAIN_ID,
  CredentialBlockchainError,
  canonicalizeCredential,
  createConnectedRuntime,
  createCredentialId,
  getConfiguration,
  getEligibility,
  getLearnerCredentials,
  hashCanonicalCredential,
  issueCredentialRecord,
  reconcileCredential,
  revokeCredential,
  validateNetworkChainId,
  validateCredentialNetwork,
  verifyPublicCredential,
};
