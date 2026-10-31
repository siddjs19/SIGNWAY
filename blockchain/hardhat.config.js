require('@nomicfoundation/hardhat-toolbox')
require('dotenv').config()
module.exports = {
  solidity: '0.8.24',
  networks: {
    mst: {
      url: process.env.MST_RPC_URL || 'https://coralrpc.mstblockchain.com/',
      chainId: Number(process.env.MST_CHAIN_ID || 54635),
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : []
    }
  }
}
