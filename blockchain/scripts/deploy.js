const hre = require('hardhat')
async function main () {
  const [deployer] = await hre.ethers.getSigners()
  if (!deployer) throw new Error('Set DEPLOYER_PRIVATE_KEY in blockchain/.env')
  const Factory = await hre.ethers.getContractFactory('CredentialRegistry')
  const contract = await Factory.deploy(deployer.address)
  await contract.waitForDeployment()
  console.log('CredentialRegistry deployed:', await contract.getAddress())
}
main().catch(e => {
  console.error(e)
  process.exitCode = 1
})
