const fs = require('node:fs/promises');
const path = require('node:path');
const hre = require('hardhat');

async function main() {
  await hre.run('compile');
  const artifact = await hre.artifacts.readArtifact('CredentialRegistry');
  const outputPath = path.resolve(
    __dirname,
    '../../backend/src/blockchain/abi/CredentialRegistry.json',
  );
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify({ abi: artifact.abi }, null, 2)}\n`);
  console.log(`Exported CredentialRegistry ABI to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
