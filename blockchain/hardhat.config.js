require('@nomicfoundation/hardhat-ethers');
require('@nomicfoundation/hardhat-chai-matchers');
require('dotenv').config({ path: `${__dirname}/.env` });

const config = {
  solidity: '0.8.24',
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
};

if (process.env.MST_RPC_URL && process.env.MST_ISSUER_PRIVATE_KEY) {
  config.networks = {
    coral: {
      url: process.env.MST_RPC_URL,
      chainId: Number(process.env.MST_CHAIN_ID || 54635),
      accounts: [process.env.MST_ISSUER_PRIVATE_KEY],
    },
  };
}

module.exports = config;
