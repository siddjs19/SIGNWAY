// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/access/AccessControl.sol";
contract CredentialRegistry is AccessControl {
 bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
 struct Credential { address subject; bytes32 metadataHash; uint64 issuedAt; bool revoked; }
 mapping(bytes32 => Credential) private credentials;
 event CredentialIssued(bytes32 indexed credentialId,address indexed subject,bytes32 metadataHash,uint64 issuedAt);
 event CredentialRevoked(bytes32 indexed credentialId,address indexed subject);
 constructor(address admin){_grantRole(DEFAULT_ADMIN_ROLE,admin);_grantRole(ISSUER_ROLE,admin);}
 function issue(bytes32 id,address subject,bytes32 metadataHash) external onlyRole(ISSUER_ROLE){require(id!=bytes32(0)&&subject!=address(0),"invalid input");require(credentials[id].issuedAt==0,"already issued");credentials[id]=Credential(subject,metadataHash,uint64(block.timestamp),false);emit CredentialIssued(id,subject,metadataHash,uint64(block.timestamp));}
 function revoke(bytes32 id) external onlyRole(ISSUER_ROLE){Credential storage c=credentials[id];require(c.issuedAt!=0,"unknown credential");require(!c.revoked,"already revoked");c.revoked=true;emit CredentialRevoked(id,c.subject);}
 function verify(bytes32 id) external view returns(address subject,bytes32 metadataHash,uint64 issuedAt,bool revoked){Credential memory c=credentials[id];return(c.subject,c.metadataHash,c.issuedAt,c.revoked);}
}
