const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema(
  {
    credentialId: {
      type: String,
      required: true,
      unique: true,
      match: /^0x[0-9a-f]{64}$/,
    },
    learnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: String,
      required: true,
      enum: ['isl-learning-path'],
    },
    credentialHash: {
      type: String,
      required: true,
      match: /^0x[0-9a-f]{64}$/,
    },
    issuerAddress: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[0-9a-f]{40}$/,
    },
    transactionHash: {
      type: String,
      default: null,
      match: [/^0x[0-9a-f]{64}$/i, 'Transaction hash must be a 32-byte hex string'],
    },
    revocationTransactionHash: {
      type: String,
      default: null,
      match: [/^0x[0-9a-f]{64}$/i, 'Revocation transaction hash must be a 32-byte hex string'],
    },
    blockNumber: {
      type: Number,
      default: null,
      min: 0,
    },
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
      match: /^0x[0-9a-f]{40}$/,
    },
    networkChainId: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'issued', 'revoked', 'failed'],
      default: 'pending',
      required: true,
    },
    issuedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    canonicalCredential: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true },
);

credentialSchema.index({ learnerId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Credential', credentialSchema);
