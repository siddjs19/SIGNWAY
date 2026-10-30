const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CredentialRegistry', () => {
  async function deployRegistry() {
    const [admin, issuer, learner] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory('CredentialRegistry');
    const registry = await Registry.deploy(admin.address);
    await registry.waitForDeployment();
    return { registry, admin, issuer, learner };
  }

  const credentialId = ethers.keccak256(ethers.toUtf8Bytes('credential-1'));
  const credentialHash = ethers.keccak256(ethers.toUtf8Bytes('canonical credential'));

  it('grants the initial issuer role to the deployer', async () => {
    const { registry, admin } = await deployRegistry();
    expect(await registry.hasRole(await registry.ISSUER_ROLE(), admin.address)).to.equal(true);
  });

  it('rejects unauthorized issuance and revocation', async () => {
    const { registry, issuer } = await deployRegistry();
    await expect(registry.connect(issuer).issueCredential(credentialId, credentialHash))
      .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount');
    await expect(registry.connect(issuer).revokeCredential(credentialId))
      .to.be.revertedWithCustomError(registry, 'AccessControlUnauthorizedAccount');
  });

  it('issues a public verifiable credential and emits its event', async () => {
    const { registry, admin } = await deployRegistry();
    await expect(registry.issueCredential(credentialId, credentialHash))
      .to.emit(registry, 'CredentialIssued')
      .withArgs(credentialId, credentialHash, admin.address, await latestTimestamp());

    const result = await registry.verifyCredential(credentialId);
    expect(result.exists).to.equal(true);
    expect(result.credentialHash).to.equal(credentialHash);
    expect(result.issuer).to.equal(admin.address);
    expect(result.issuedAt).to.be.greaterThan(0);
    expect(result.revoked).to.equal(false);
  });

  it('rejects duplicate credential IDs and zero values', async () => {
    const { registry } = await deployRegistry();
    await registry.issueCredential(credentialId, credentialHash);
    await expect(registry.issueCredential(credentialId, credentialHash))
      .to.be.revertedWithCustomError(registry, 'CredentialAlreadyExists');
    await expect(registry.issueCredential(ethers.ZeroHash, credentialHash))
      .to.be.revertedWithCustomError(registry, 'InvalidCredentialId');
    await expect(registry.issueCredential(credentialId, ethers.ZeroHash))
      .to.be.revertedWithCustomError(registry, 'InvalidCredentialHash');
  });

  it('returns a non-existent result for unknown credentials', async () => {
    const { registry } = await deployRegistry();
    const result = await registry.verifyCredential(credentialId);
    expect(result.exists).to.equal(false);
  });

  it('revokes an issued credential and exposes its revoked status', async () => {
    const { registry, admin } = await deployRegistry();
    await registry.issueCredential(credentialId, credentialHash);
    await expect(registry.revokeCredential(credentialId))
      .to.emit(registry, 'CredentialRevoked')
      .withArgs(credentialId, credentialHash, admin.address, await latestTimestamp());
    const result = await registry.verifyCredential(credentialId);
    expect(result.exists).to.equal(true);
    expect(result.revoked).to.equal(true);
  });
});

async function latestTimestamp() {
  const block = await ethers.provider.getBlock('latest');
  return block.timestamp + 1;
}
