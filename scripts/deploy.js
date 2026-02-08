const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  console.log("═══════════════════════════════════════════");
  console.log("  SaThuCoin Deployment");
  console.log("═══════════════════════════════════════════");
  console.log(`  Network:  ${network}`);
  console.log(`  Chain ID: ${chainId}`);
  console.log(`  Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`  Balance:  ${hre.ethers.formatEther(balance)} ETH`);
  console.log("═══════════════════════════════════════════");

  if (balance === 0n) {
    console.error("\n❌ Deployer has zero balance. Fund the wallet first.");
    process.exit(1);
  }

  // Deploy
  console.log("\n⏳ Deploying SaThuCoin...");
  const SaThuCoin = await hre.ethers.getContractFactory("SaThuCoin");
  const token = await SaThuCoin.deploy();
  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  const deployTx = token.deploymentTransaction();

  console.log(`\n✅ SaThuCoin deployed!`);
  console.log(`   Address: ${contractAddress}`);
  console.log(`   Tx Hash: ${deployTx.hash}`);

  // Verify initial state
  const name = await token.name();
  const symbol = await token.symbol();
  const totalSupply = await token.totalSupply();
  const owner = await token.owner();

  console.log(`\n📋 Contract State:`);
  console.log(`   Name:         ${name}`);
  console.log(`   Symbol:       ${symbol}`);
  console.log(`   Total Supply: ${hre.ethers.formatEther(totalSupply)} ${symbol}`);
  console.log(`   Owner:        ${owner}`);

  // Save deployment info
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const deploymentInfo = {
    network: network,
    chainId: chainId.toString(),
    contractAddress: contractAddress,
    deployer: deployer.address,
    txHash: deployTx.hash,
    timestamp: new Date().toISOString(),
    blockNumber: deployTx.blockNumber,
    solidity: "0.8.26",
    optimizer: { enabled: true, runs: 200 },
  };

  const deploymentFile = path.join(dataDir, "deployment.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: data/deployment.json`);

  // Verification reminder
  if (network !== "hardhat" && network !== "localhost") {
    console.log(`\n🔍 To verify on BaseScan, wait ~60 seconds then run:`);
    console.log(`   npx hardhat verify --network ${network} ${contractAddress}`);
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("  Deployment complete!");
  console.log("═══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error.message);
  process.exitCode = 1;
});
