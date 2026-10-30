const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Wallet, keccak256, toUtf8Bytes } = require('ethers');
const blockchain = require('../src/services/credentialBlockchain');
const Credential = require('../src/models/Credential');
const Lesson = require('../src/models/Lesson');
const LessonCompletion = require('../src/models/LessonCompletion');
const Progress = require('../src/models/Progress');

function query(value) {
  return {
    select() {
      return this;
    },
    lean() {
      return Promise.resolve(value);
    },
  };
}

test('canonical credential serialization and keccak hash are deterministic and identity-free', () => {
  const issuedAt = '2026-10-30T00:00:00.000Z';
  const credential = {
    credentialId: `0x${'a'.repeat(64)}`,
    courseId: blockchain.COURSE_ID,
    issuedAt,
  };
  const canonical = blockchain.canonicalizeCredential(credential);
  assert.equal(canonical, blockchain.canonicalizeCredential(credential));
  assert.equal(blockchain.hashCanonicalCredential(canonical), keccak256(toUtf8Bytes(canonical)));
  assert.ok(!canonical.includes('name'));
  assert.ok(!canonical.includes('email'));
  assert.ok(!canonical.includes('score'));
});

test('generated credential IDs are random 32-byte values', () => {
  const first = blockchain.createCredentialId();
  const second = blockchain.createCredentialId();
  assert.match(first, /^0x[0-9a-f]{64}$/);
  assert.notEqual(first, second);
});

test('eligibility follows the existing all-published-lessons completion milestone', async () => {
  const originalLessonFind = Lesson.find;
  const originalCompletionFind = LessonCompletion.find;
  const originalProgressFindOne = Progress.findOne;
  const lessonIds = ['lesson-a', 'lesson-b'];
  try {
    Lesson.find = () => query(lessonIds.map((_id) => ({ _id })));
    LessonCompletion.find = () => query(lessonIds.map((lesson) => ({ lesson })));
    Progress.findOne = () => query({ achievements: [blockchain.ACHIEVEMENT_NAME] });

    const result = await blockchain.getEligibility('learner-id');
    assert.equal(result.eligible, true);
    assert.equal(result.completedLessons, 2);
    assert.equal(result.totalLessons, 2);

    LessonCompletion.find = () => query([{ lesson: lessonIds[0] }]);
    assert.equal((await blockchain.getEligibility('learner-id')).eligible, false);
  } finally {
    Lesson.find = originalLessonFind;
    LessonCompletion.find = originalCompletionFind;
    Progress.findOne = originalProgressFindOne;
  }
});

test('RPC chain mismatch is rejected and Coral config cannot fall back to another chain', () => {
  assert.throws(
    () => blockchain.validateNetworkChainId(1, 54635),
    (error) => error.code === 'MST_CHAIN_ID_MISMATCH',
  );
  assert.doesNotThrow(() => blockchain.validateNetworkChainId(54635, 54635));

  const originalChainId = process.env.MST_CHAIN_ID;
  const originalRpcUrl = process.env.MST_RPC_URL;
  const originalContract = process.env.MST_CREDENTIAL_CONTRACT_ADDRESS;
  const originalKey = process.env.MST_ISSUER_PRIVATE_KEY;
  try {
    process.env.MST_CHAIN_ID = '54635';
    process.env.MST_RPC_URL = 'https://coralrpc.mstblockchain.com/';
    process.env.MST_CREDENTIAL_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000001';
    process.env.MST_ISSUER_PRIVATE_KEY = Wallet.createRandom().privateKey;
    assert.equal(blockchain.getConfiguration().chainId, 54635);
    process.env.MST_CHAIN_ID = '97';
    assert.throws(
      () => blockchain.getConfiguration(),
      (error) => error.code === 'MST_CHAIN_ID_INVALID',
    );
  } finally {
    if (originalChainId === undefined) delete process.env.MST_CHAIN_ID;
    else process.env.MST_CHAIN_ID = originalChainId;
    if (originalRpcUrl === undefined) delete process.env.MST_RPC_URL;
    else process.env.MST_RPC_URL = originalRpcUrl;
    if (originalContract === undefined) delete process.env.MST_CREDENTIAL_CONTRACT_ADDRESS;
    else process.env.MST_CREDENTIAL_CONTRACT_ADDRESS = originalContract;
    if (originalKey === undefined) delete process.env.MST_ISSUER_PRIVATE_KEY;
    else process.env.MST_ISSUER_PRIVATE_KEY = originalKey;
  }
});

test('confirmed issuance reconciles on-chain data and persists confirmation metadata', async () => {
  const record = {
    _id: 'credential-record-id',
    credentialId: `0x${'a'.repeat(64)}`,
    credentialHash: `0x${'b'.repeat(64)}`,
    canonicalCredential: '{"credential":"canonical"}',
    issuerAddress: '0x0000000000000000000000000000000000000001',
    transactionHash: `0x${'c'.repeat(64)}`,
    contractAddress: '0x0000000000000000000000000000000000000002',
    networkChainId: blockchain.TARGET_CHAIN_ID,
  };
  record.credentialHash = blockchain.hashCanonicalCredential(record.canonicalCredential);
  const updates = [];
  const originalUpdateOne = Credential.updateOne;
  const originalFindById = Credential.findById;
  Credential.updateOne = async (_filter, update) => updates.push(update.$set);
  Credential.findById = () => query({ ...record, status: 'issued', blockNumber: 70 });

  try {
    const result = await blockchain.reconcileCredential(record, {
      configuration: {
        chainId: blockchain.TARGET_CHAIN_ID,
        contractAddress: record.contractAddress,
      },
      contract: {
        verifyCredential: async () => ({
          exists: true,
          credentialHash: record.credentialHash,
          issuer: record.issuerAddress,
          issuedAt: 1_800_000_000n,
          revoked: false,
        }),
      },
      provider: {
        getTransactionReceipt: async () => ({ status: 1, blockNumber: 70 }),
      },
    });
    assert.equal(result.status, 'issued');
    assert.equal(updates[0].status, 'issued');
    assert.equal(updates[0].blockNumber, 70);
    assert.equal(updates[0].issuedAt.toISOString(), '2027-01-15T08:00:00.000Z');
  } finally {
    Credential.updateOne = originalUpdateOne;
    Credential.findById = originalFindById;
  }
});

test('pending issuance stays pending until a receipt is available', async () => {
  const record = {
    credentialId: `0x${'a'.repeat(64)}`,
    credentialHash: `0x${'b'.repeat(64)}`,
    canonicalCredential: '{"credential":"canonical"}',
    issuerAddress: '0x0000000000000000000000000000000000000001',
    transactionHash: `0x${'c'.repeat(64)}`,
    contractAddress: '0x0000000000000000000000000000000000000002',
    networkChainId: blockchain.TARGET_CHAIN_ID,
    status: 'pending',
  };
  record.credentialHash = blockchain.hashCanonicalCredential(record.canonicalCredential);
  const originalUpdateOne = Credential.updateOne;
  let persisted = false;
  Credential.updateOne = async () => {
    persisted = true;
  };

  try {
    const result = await blockchain.reconcileCredential(record, {
      configuration: {
        chainId: blockchain.TARGET_CHAIN_ID,
        contractAddress: record.contractAddress,
      },
      contract: {
        verifyCredential: async () => ({
          exists: true,
          credentialHash: record.credentialHash,
          issuer: record.issuerAddress,
          issuedAt: 1_800_000_000n,
          revoked: false,
        }),
      },
      provider: { getTransactionReceipt: async () => null },
    });
    assert.equal(result, record);
    assert.equal(persisted, false);
  } finally {
    Credential.updateOne = originalUpdateOne;
  }
});

test('failed issuance receipt is persisted as failed', async () => {
  const record = {
    _id: 'credential-record-id',
    credentialId: `0x${'a'.repeat(64)}`,
    credentialHash: `0x${'b'.repeat(64)}`,
    canonicalCredential: '{"credential":"canonical"}',
    transactionHash: `0x${'c'.repeat(64)}`,
    contractAddress: '0x0000000000000000000000000000000000000002',
    networkChainId: blockchain.TARGET_CHAIN_ID,
    status: 'pending',
  };
  record.credentialHash = blockchain.hashCanonicalCredential(record.canonicalCredential);
  const originalUpdateOne = Credential.updateOne;
  const originalFindById = Credential.findById;
  let persistedStatus;
  Credential.updateOne = async (_filter, update) => {
    persistedStatus = update.$set.status;
  };
  Credential.findById = () => query({ ...record, status: 'failed' });

  try {
    const result = await blockchain.reconcileCredential(record, {
      configuration: {
        chainId: blockchain.TARGET_CHAIN_ID,
        contractAddress: record.contractAddress,
      },
      contract: {
        verifyCredential: async () => ({ exists: false }),
      },
      provider: { getTransactionReceipt: async () => ({ status: 0 }) },
    });
    assert.equal(persistedStatus, 'failed');
    assert.equal(result.status, 'failed');
  } finally {
    Credential.updateOne = originalUpdateOne;
    Credential.findById = originalFindById;
  }
});
