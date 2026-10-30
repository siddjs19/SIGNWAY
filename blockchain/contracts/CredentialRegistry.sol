// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract CredentialRegistry is AccessControl {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    struct Credential {
        bytes32 credentialHash;
        address issuer;
        uint64 issuedAt;
        bool revoked;
    }

    mapping(bytes32 credentialId => Credential credential) private credentials;

    error InvalidCredentialId();
    error InvalidCredentialHash();
    error InvalidAdmin();
    error CredentialAlreadyExists(bytes32 credentialId);
    error CredentialNotFound(bytes32 credentialId);
    error CredentialAlreadyRevoked(bytes32 credentialId);

    event CredentialIssued(
        bytes32 indexed credentialId,
        bytes32 indexed credentialHash,
        address indexed issuer,
        uint64 issuedAt
    );
    event CredentialRevoked(
        bytes32 indexed credentialId,
        bytes32 indexed credentialHash,
        address indexed issuer,
        uint64 revokedAt
    );

    constructor(address admin) {
        if (admin == address(0)) revert InvalidAdmin();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
    }

    function issueCredential(bytes32 credentialId, bytes32 credentialHash)
        external
        onlyRole(ISSUER_ROLE)
    {
        if (credentialId == bytes32(0)) revert InvalidCredentialId();
        if (credentialHash == bytes32(0)) revert InvalidCredentialHash();
        if (credentials[credentialId].issuedAt != 0) {
            revert CredentialAlreadyExists(credentialId);
        }

        uint64 issuedAt = uint64(block.timestamp);
        credentials[credentialId] = Credential({
            credentialHash: credentialHash,
            issuer: msg.sender,
            issuedAt: issuedAt,
            revoked: false
        });

        emit CredentialIssued(credentialId, credentialHash, msg.sender, issuedAt);
    }

    function revokeCredential(bytes32 credentialId) external onlyRole(ISSUER_ROLE) {
        Credential storage credential = credentials[credentialId];
        if (credential.issuedAt == 0) revert CredentialNotFound(credentialId);
        if (credential.revoked) revert CredentialAlreadyRevoked(credentialId);

        credential.revoked = true;
        emit CredentialRevoked(
            credentialId,
            credential.credentialHash,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    function verifyCredential(bytes32 credentialId)
        external
        view
        returns (
            bool exists,
            bytes32 credentialHash,
            address issuer,
            uint64 issuedAt,
            bool revoked
        )
    {
        Credential memory credential = credentials[credentialId];
        exists = credential.issuedAt != 0;
        return (
            exists,
            credential.credentialHash,
            credential.issuer,
            credential.issuedAt,
            credential.revoked
        );
    }
}
