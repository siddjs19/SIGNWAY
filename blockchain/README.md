# MST Blockchain Credential Registry

The Solidity contract is a deployable scaffold, not a deployed contract. No contract address or transaction is included because deployment has not been performed.

Before deployment:
1. Review the contract and threat model.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env`.
4. Set a funded testnet deployer key and RPC URL.
5. Run `npm run compile` and `npm test` (add contract tests before production).
6. Deploy with `npm run deploy:mst`.
7. Independently verify the deployed address and transaction on the MST explorer.
8. Only then configure `MST_CONTRACT_ADDRESS` and related backend environment values.

Never commit private keys.
