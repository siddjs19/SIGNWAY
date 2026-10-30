const { ethers } = require('hardhat');

async function main() {
  const network = await ethers.provider.getNetwork();
  const expectedChainId = 54635;
  const configuredChainId = Number(process.env.MST_CHAIN_ID || expectedChainId);
  if (configuredChainId !== expectedChainId) {
    throw new Error(`Refusing deployment: MST_CHAIN_ID must be ${expectedChainId}, not ${configuredChainId}.`);
  }
  if (Number(network.chainId) !== expectedChainId) {
    throw new Error(`Refusing deployment: connected chain ${network.chainId}, expected ${expectedChainId}.`);
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance === 0n) {
    throw new Error(`Deployment signer ${deployer.address} has no test-token balance.`);
  }

  const Registry = await ethers.getContractFactory('CredentialRegistry');
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();

  const deploymentTransaction = registry.deploymentTransaction();
  if (!deploymentTransaction) throw new Error('Contract deployment transaction was not created.');
  const receipt = await deploymentTransaction.wait(1);
  if (!receipt || receipt.status !== 1) throw new Error('Contract deployment was not confirmed.');

  console.log(JSON.stringify({
    chainId: Number(network.chainId),
    deployer: deployer.address,
    contractAddress: await registry.getAddress(),
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
