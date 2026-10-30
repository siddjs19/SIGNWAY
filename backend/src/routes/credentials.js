const express = require('express');
const { Wallet } = require('ethers');
const auth = require('../middleware/auth');
const Credential = require('../models/Credential');
const credentialBlockchain = require('../services/credentialBlockchain');

const router = express.Router();

function toLearnerCredential(record) {
  return {
    credentialId: record.credentialId,
    courseId: record.courseId,
    credentialHash: record.credentialHash,
    issuerAddress: record.issuerAddress,
    transactionHash: record.transactionHash,
    revocationTransactionHash: record.revocationTransactionHash,
    blockNumber: record.blockNumber,
    contractAddress: record.contractAddress,
    networkChainId: record.networkChainId,
    status: record.status,
    issuedAt: record.issuedAt,
    revokedAt: record.revokedAt,
    verificationUrl: `/verify/${record.credentialId}`,
  };
}

function handleError(res, error) {
  const known = error instanceof credentialBlockchain.CredentialBlockchainError;
  if (!known) console.error('Credential operation failed:', error.name || 'UnknownError');
  return res.status(known ? error.status : 500).json({
    success: false,
    code: known ? error.code : 'CREDENTIAL_OPERATION_FAILED',
    message: known ? error.message : 'Credential operation could not be completed.',
  });
}

router.get('/verify/:credentialId', async (req, res) => {
  try {
    const result = await credentialBlockchain.verifyPublicCredential(req.params.credentialId);
    return res.json({ success: true, data: result });
  } catch (error) {
    return handleError(res, error);
  }
});

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const [eligibility, credentials] = await Promise.all([
      credentialBlockchain.getEligibility(req.user._id),
      credentialBlockchain.getLearnerCredentials(req.user._id),
    ]);
    return res.json({
      success: true,
      data: {
        eligibility,
        credentials: credentials.map(toLearnerCredential),
        network: {
          chainId: credentialBlockchain.TARGET_CHAIN_ID,
          explorerUrl: process.env.MST_EXPLORER_URL || 'https://coral.mstscan.com/',
          contractConfigured: Boolean(process.env.MST_CREDENTIAL_CONTRACT_ADDRESS),
          issuanceConfigured: Boolean(
            process.env.MST_CREDENTIAL_CONTRACT_ADDRESS
            && process.env.MST_ISSUER_PRIVATE_KEY,
          ),
        },
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/issue', async (req, res) => {
  if (req.body && Object.keys(req.body).length) {
    return res.status(400).json({
      success: false,
      code: 'UNEXPECTED_CREDENTIAL_INPUT',
      message: 'Credential details are derived from SignBridge records and cannot be supplied by clients.',
    });
  }

  let record;
  try {
    const eligibility = await credentialBlockchain.getEligibility(req.user._id);
    if (!eligibility.eligible) {
      return res.status(409).json({
        success: false,
        code: 'CREDENTIAL_NOT_ELIGIBLE',
        message: eligibility.reason,
        data: { eligibility },
      });
    }

    record = await Credential.findOne({
      learnerId: req.user._id,
      courseId: credentialBlockchain.COURSE_ID,
    }).select('+canonicalCredential');
    if (record?.status === 'revoked') {
      return res.status(409).json({
        success: false,
        code: 'CREDENTIAL_ALREADY_REVOKED',
        message: 'This achievement credential was revoked and cannot be reissued.',
      });
    }
    if (record?.status === 'issued') {
      return res.status(200).json({ success: true, data: toLearnerCredential(record) });
    }

    if (!record) {
      const configuration = credentialBlockchain.getConfiguration();
      const credentialId = credentialBlockchain.createCredentialId();
      const issuedAt = new Date();
      const canonicalCredential = credentialBlockchain.canonicalizeCredential({
        credentialId,
        courseId: credentialBlockchain.COURSE_ID,
        issuedAt,
      });
      record = await Credential.create({
        credentialId,
        learnerId: req.user._id,
        courseId: credentialBlockchain.COURSE_ID,
        credentialHash: credentialBlockchain.hashCanonicalCredential(canonicalCredential),
        issuerAddress: new Wallet(configuration.privateKey).address,
        contractAddress: configuration.contractAddress,
        networkChainId: configuration.chainId,
        status: 'pending',
        canonicalCredential,
      });
    }

    record = record.status === 'pending' && record.transactionHash
      ? await credentialBlockchain.reconcileCredential(record)
      : record;
    if (record.status === 'failed') {
      record = await Credential.findOneAndUpdate(
        { _id: record._id },
        { $set: { status: 'pending' } },
        { new: true },
      ).select('+canonicalCredential');
    }
    if (record.status === 'issued') {
      return res.status(200).json({ success: true, data: toLearnerCredential(record) });
    }
    if (record.status === 'pending' && !record.transactionHash) {
      record = await credentialBlockchain.issueCredentialRecord(record);
    }
    if (record.status === 'issued') {
      return res.status(200).json({ success: true, data: toLearnerCredential(record) });
    }
    return res.status(202).json({
      success: true,
      pending: true,
      data: toLearnerCredential(record),
      message: 'Issuance transaction is pending confirmation. Verify again to refresh its status.',
    });
  } catch (error) {
    if (record?._id && record.status === 'pending' && !record.transactionHash) {
      await Credential.updateOne({ _id: record._id }, { $set: { status: 'failed' } });
    }
    return handleError(res, error);
  }
});

router.post('/:credentialId/revoke', async (req, res) => {
  const authorizedIssuers = (process.env.MST_CREDENTIAL_REVOKER_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!req.user.email || !authorizedIssuers.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({
      success: false,
      code: 'CREDENTIAL_ISSUER_REQUIRED',
      message: 'Only configured credential issuers may revoke credentials.',
    });
  }

  const { credentialId } = req.params;
  if (!/^0x[0-9a-f]{64}$/i.test(credentialId)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_CREDENTIAL_ID',
      message: 'Credential ID must be a 32-byte hex value.',
    });
  }
  if (req.body && Object.keys(req.body).length) {
    return res.status(400).json({
      success: false,
      code: 'UNEXPECTED_CREDENTIAL_INPUT',
      message: 'Revocation details cannot be supplied by clients.',
    });
  }

  try {
    const record = await Credential.findOne({
      credentialId: credentialId.toLowerCase(),
      status: { $in: ['issued', 'revoked'] },
    });
    if (!record) {
      return res.status(404).json({
        success: false,
        code: 'CREDENTIAL_NOT_FOUND',
        message: 'An issued credential was not found.',
      });
    }
    const revoked = await credentialBlockchain.revokeCredential(record);
    return res.json({ success: true, data: toLearnerCredential(revoked) });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;
