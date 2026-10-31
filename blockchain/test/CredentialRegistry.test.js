
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialRegistry", function () {
  let registry;
  let admin;
  let issuer;
  let user;
  let unauthorized;

  let credentialId;
  let metadataHash;

  const ISSUER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("ISSUER_ROLE")
  );

  beforeEach(async function () {
    [admin, issuer, user, unauthorized] =
      await ethers.getSigners();

    const Registry = await ethers.getContractFactory(
      "CredentialRegistry"
    );

    // Constructor requires admin address.
    registry = await Registry.deploy(admin.address);
    await registry.waitForDeployment();

    // Grant issuer permission.
    await registry.grantRole(ISSUER_ROLE, issuer.address);

    credentialId = ethers.keccak256(
      ethers.toUtf8Bytes("credential-001")
    );

    metadataHash = ethers.keccak256(
      ethers.toUtf8Bytes("metadata-001")
    );
  });

  it("should deploy successfully", async function () {
    expect(await registry.getAddress()).to.be.properAddress;
  });

  it("should assign admin and issuer roles to deployer", async function () {
    expect(
      await registry.hasRole(
        ethers.ZeroHash,
        admin.address
      )
    ).to.equal(true);

    expect(
      await registry.hasRole(
        ISSUER_ROLE,
        admin.address
      )
    ).to.equal(true);
  });

  it("should allow authorized issuer to issue credentials", async function () {
    await expect(
      registry.connect(issuer).issue(
        credentialId,
        user.address,
        metadataHash
      )
    ).to.emit(registry, "CredentialIssued");
  });

  it("should reject unauthorized credential issuance", async function () {
    await expect(
      registry.connect(unauthorized).issue(
        credentialId,
        user.address,
        metadataHash
      )
    ).to.be.reverted;
  });

  it("should reject duplicate credential IDs", async function () {
    await registry.connect(issuer).issue(
      credentialId,
      user.address,
      metadataHash
    );

    await expect(
      registry.connect(issuer).issue(
        credentialId,
        user.address,
        metadataHash
      )
    ).to.be.revertedWith("already issued");
  });

  it("should reject invalid credential input", async function () {
    await expect(
      registry.connect(issuer).issue(
        ethers.ZeroHash,
        user.address,
        metadataHash
      )
    ).to.be.revertedWith("invalid input");
  });

  it("should return credential details during verification", async function () {
    await registry.connect(issuer).issue(
      credentialId,
      user.address,
      metadataHash
    );

    const result = await registry.verify(credentialId);

    expect(result.subject).to.equal(user.address);
    expect(result.metadataHash).to.equal(metadataHash);
    expect(result.issuedAt).to.be.greaterThan(0);
    expect(result.revoked).to.equal(false);
  });

  it("should allow authorized issuer to revoke credentials", async function () {
    await registry.connect(issuer).issue(
      credentialId,
      user.address,
      metadataHash
    );

    await expect(
      registry.connect(issuer).revoke(credentialId)
    ).to.emit(registry, "CredentialRevoked");
  });

  it("should return revoked status after revocation", async function () {
    await registry.connect(issuer).issue(
      credentialId,
      user.address,
      metadataHash
    );

    await registry.connect(issuer).revoke(credentialId);

    const result = await registry.verify(credentialId);

    expect(result.revoked).to.equal(true);
  });

  it("should reject revocation by unauthorized accounts", async function () {
    await registry.connect(issuer).issue(
      credentialId,
      user.address,
      metadataHash
    );

    await expect(
      registry.connect(unauthorized).revoke(credentialId)
    ).to.be.reverted;
  });

  it("should reject revoking an unknown credential", async function () {
    await expect(
      registry.connect(issuer).revoke(credentialId)
    ).to.be.revertedWith("unknown credential");
  });

  it("should reject repeated revocation", async function () {
    await registry.connect(issuer).issue(
      credentialId,
      user.address,
      metadataHash
    );

    await registry.connect(issuer).revoke(credentialId);

    await expect(
      registry.connect(issuer).revoke(credentialId)
    ).to.be.revertedWith("already revoked");
  });
});
