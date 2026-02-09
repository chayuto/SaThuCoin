const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  // Mainnet safety: require explicit addresses
  if (network === "base-mainnet") {
    if (!process.env.ADMIN_ADDRESS) {
      console.error("\n  ERROR: ADMIN_ADDRESS must be set for mainnet deployment.");
      console.error("  Set it to your Safe multisig address in .env\n");
      process.exit(1);
    }
    if (!process.env.MINTER_ADDRESS) {
      console.error("\n  ERROR: MINTER_ADDRESS must be set for mainnet deployment.");
      console.error("  Set it to your minter bot address in .env\n");
      process.exit(1);
    }
  }

  // Determine and validate admin and minter addresses
  let admin, minter;
  try {
    admin = process.env.ADMIN_ADDRESS
      ? hre.ethers.getAddress(process.env.ADMIN_ADDRESS)
      : deployer.address;
  } catch (e) {
    console.error(`\n  ERROR: Invalid ADMIN_ADDRESS: ${process.env.ADMIN_ADDRESS}`);
    console.error("  Must be a valid EIP-55 checksummed Ethereum address.\n");
    process.exit(1);
  }
  try {
    minter = process.env.MINTER_ADDRESS
      ? hre.ethers.getAddress(process.env.MINTER_ADDRESS)
      : deployer.address;
  } catch (e) {
    console.error(`\n  ERROR: Invalid MINTER_ADDRESS: ${process.env.MINTER_ADDRESS}`);
    console.error("  Must be a valid EIP-55 checksummed Ethereum address.\n");
    process.exit(1);
  }

  // Warn about role separation on mainnet
  if (network === "base-mainnet" && admin === minter) {
    console.log("\n  WARNING: ADMIN_ADDRESS and MINTER_ADDRESS are the same.");
    console.log("  Consider using separate addresses for role separation.\n");
  }

  console.log("═══════════════════════════════════════════");
  console.log("  SaThuCoin Deployment");
  console.log("═══════════════════════════════════════════");
  console.log(`  Network:  ${network}`);
  console.log(`  Chain ID: ${chainId}`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Admin:    ${admin}`);
  console.log(`  Minter:   ${minter}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`  Balance:  ${hre.ethers.formatEther(balance)} ETH`);
  console.log("═══════════════════════════════════════════");

  // Warn about public RPC on mainnet
  if (network === "base-mainnet") {
    const rpcUrl = hre.network.config.url || "";
    if (rpcUrl.includes("mainnet.base.org")) {
      console.log("\n  WARNING: Using public RPC endpoint for mainnet.");
      console.log("  Consider using a private RPC (Alchemy, QuickNode) for reliability.\n");
    }
  }

  // Gas estimation
  console.log("\n  Estimating deployment gas...");
  const SaThuCoin = await hre.ethers.getContractFactory("SaThuCoin");
  const deployTx = await SaThuCoin.getDeployTransaction(admin, minter);
  const estimatedGas = await hre.ethers.provider.estimateGas(deployTx);
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || 0n;
  const estimatedCost = estimatedGas * gasPrice;

  console.log(`  Estimated gas:  ${estimatedGas.toString()}`);
  console.log(`  Gas price:      ${hre.ethers.formatUnits(gasPrice, "gwei")} gwei`);
  console.log(`  Estimated cost: ${hre.ethers.formatEther(estimatedCost)} ETH`);

  // Check balance covers deployment with 20% margin
  const minRequired = estimatedCost + estimatedCost / 5n;
  if (balance < minRequired) {
    console.error(`\n  Deployer balance too low.`);
    console.error(`  Have:     ${hre.ethers.formatEther(balance)} ETH`);
    console.error(`  Need:     ${hre.ethers.formatEther(minRequired)} ETH (est + 20% margin)`);
    process.exit(1);
  }

  // Deploy
  console.log("\n  Deploying SaThuCoin...");
  const token = await SaThuCoin.deploy(admin, minter);
  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  const receipt = await token.deploymentTransaction().wait();

  // Wait for confirmations on live networks
  const isLive = network !== "hardhat" && network !== "localhost";
  if (isLive) {
    const confirmations = network === "base-mainnet" ? 5 : 2;
    console.log(`\n  Waiting for ${confirmations} block confirmations...`);
    await token.deploymentTransaction().wait(confirmations);
    console.log(`  ${confirmations} confirmations received.`);
  }

  console.log(`\n  SaThuCoin deployed!`);
  console.log(`   Address:    ${contractAddress}`);
  console.log(`   Tx Hash:    ${receipt.hash}`);
  console.log(`   Block:      ${receipt.blockNumber}`);
  console.log(`   Gas Used:   ${receipt.gasUsed.toString()}`);

  // Verify initial state (role-based)
  const name = await token.name();
  const symbol = await token.symbol();
  const totalSupply = await token.totalSupply();
  const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE = await token.MINTER_ROLE();
  const PAUSER_ROLE = await token.PAUSER_ROLE();

  const adminHasAdmin = await token.hasRole(DEFAULT_ADMIN_ROLE, admin);
  const minterHasMinter = await token.hasRole(MINTER_ROLE, minter);
  const adminHasPauser = await token.hasRole(PAUSER_ROLE, admin);

  console.log(`\n  Contract State:`);
  console.log(`   Name:         ${name}`);
  console.log(`   Symbol:       ${symbol}`);
  console.log(`   Total Supply: ${hre.ethers.formatEther(totalSupply)} ${symbol}`);
  console.log(`   Admin role:   ${admin} -> ${adminHasAdmin}`);
  console.log(`   Minter role:  ${minter} -> ${minterHasMinter}`);
  console.log(`   Pauser role:  ${admin} -> ${adminHasPauser}`);

  if (!adminHasAdmin || !minterHasMinter || !adminHasPauser) {
    console.error("\n  ROLE VERIFICATION FAILED — roles not set correctly!");
    process.exit(1);
  }

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
    admin: admin,
    minter: minter,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    timestamp: new Date().toISOString(),
    solidity: "0.8.26",
    optimizer: { enabled: true, runs: 200 },
  };

  const deploymentFile = path.join(dataDir, "deployment.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n  Deployment info saved to: data/deployment.json`);

  // Post-deploy instructions
  if (isLive) {
    console.log(`\n  To verify on BaseScan, wait ~60 seconds then run:`);
    console.log(`   npx hardhat run scripts/verify.js --network ${network}`);
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("  Deployment complete!");
  console.log("═══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error("\n  Deployment failed:", error.message);
  process.exitCode = 1;
});
