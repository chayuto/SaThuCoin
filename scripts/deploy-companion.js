const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  // ─── Load SaThuCoin deployment info ────────────────────────────────
  const deploymentFile = path.join(__dirname, "..", "data", "deployment.json");
  if (!fs.existsSync(deploymentFile)) {
    console.error("  No deployment.json found. Deploy SaThuCoin first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const sathuAddress = deployment.contractAddress;

  // Validate SaThuCoin exists at the expected address
  const sathuCode = await hre.ethers.provider.getCode(sathuAddress);
  if (sathuCode === "0x") {
    console.error(`  No contract found at SaThuCoin address: ${sathuAddress}`);
    console.error("  Are you on the right network?");
    process.exit(1);
  }

  // ─── Determine admin and minter addresses ──────────────────────────
  // Mainnet safety: require explicit addresses
  if (network === "base-mainnet") {
    if (!process.env.COMPANION_ADMIN_ADDRESS) {
      console.error("\n  ERROR: COMPANION_ADMIN_ADDRESS must be set for mainnet deployment.");
      console.error("  Set it to your Safe multisig or admin EOA in .env\n");
      process.exit(1);
    }
    if (!process.env.COMPANION_MINTER_ADDRESS) {
      console.error("\n  ERROR: COMPANION_MINTER_ADDRESS must be set for mainnet deployment.");
      console.error("  Set it to your minter bot address in .env\n");
      process.exit(1);
    }
  }

  let admin, minter;
  try {
    admin = process.env.COMPANION_ADMIN_ADDRESS
      ? hre.ethers.getAddress(process.env.COMPANION_ADMIN_ADDRESS)
      : deployer.address;
  } catch (e) {
    console.error(`\n  ERROR: Invalid COMPANION_ADMIN_ADDRESS: ${process.env.COMPANION_ADMIN_ADDRESS}`);
    console.error("  Must be a valid EIP-55 checksummed Ethereum address.\n");
    process.exit(1);
  }
  try {
    minter = process.env.COMPANION_MINTER_ADDRESS
      ? hre.ethers.getAddress(process.env.COMPANION_MINTER_ADDRESS)
      : deployer.address;
  } catch (e) {
    console.error(`\n  ERROR: Invalid COMPANION_MINTER_ADDRESS: ${process.env.COMPANION_MINTER_ADDRESS}`);
    console.error("  Must be a valid EIP-55 checksummed Ethereum address.\n");
    process.exit(1);
  }

  // ─── Display deployment info ───────────────────────────────────────
  console.log("═══════════════════════════════════════════");
  console.log("  SaThuCompanion Deployment");
  console.log("═══════════════════════════════════════════");
  console.log(`  Network:   ${network}`);
  console.log(`  Chain ID:  ${chainId}`);
  console.log(`  Deployer:  ${deployer.address}`);
  console.log(`  SaThuCoin: ${sathuAddress}`);
  console.log(`  Admin:     ${admin}`);
  console.log(`  Minter:    ${minter}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`  Balance:   ${hre.ethers.formatEther(balance)} ETH`);
  console.log("═══════════════════════════════════════════");

  // Warn about public RPC on mainnet
  if (network === "base-mainnet") {
    const rpcUrl = hre.network.config.url || "";
    if (rpcUrl.includes("mainnet.base.org")) {
      console.log("\n  WARNING: Using public RPC endpoint for mainnet.");
      console.log("  Consider using a private RPC (Alchemy, QuickNode) for reliability.\n");
    }
  }

  // ─── Gas estimation ────────────────────────────────────────────────
  console.log("\n  Estimating deployment gas...");
  const SaThuCompanion = await hre.ethers.getContractFactory("SaThuCompanion");
  const deployTx = await SaThuCompanion.getDeployTransaction(sathuAddress, admin, minter);
  const estimatedGas = await hre.ethers.provider.estimateGas(deployTx);
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || 0n;
  const estimatedCost = estimatedGas * gasPrice;

  console.log(`  Estimated gas:  ${estimatedGas.toString()}`);
  console.log(`  Gas price:      ${hre.ethers.formatUnits(gasPrice, "gwei")} gwei`);
  console.log(`  Estimated cost: ${hre.ethers.formatEther(estimatedCost)} ETH`);

  // Check balance
  const minRequired = estimatedCost + estimatedCost / 5n;
  if (balance < minRequired) {
    console.error(`\n  Deployer balance too low.`);
    console.error(`  Have:     ${hre.ethers.formatEther(balance)} ETH`);
    console.error(`  Need:     ${hre.ethers.formatEther(minRequired)} ETH (est + 20% margin)`);
    process.exit(1);
  }

  // ─── Deploy ────────────────────────────────────────────────────────
  console.log("\n  Deploying SaThuCompanion...");
  const companion = await SaThuCompanion.deploy(sathuAddress, admin, minter);
  await companion.waitForDeployment();

  const companionAddress = await companion.getAddress();
  const receipt = await companion.deploymentTransaction().wait();

  // Wait for confirmations on live networks
  const isLive = network !== "hardhat" && network !== "localhost";
  if (isLive) {
    const confirmations = network === "base-mainnet" ? 5 : 2;
    console.log(`\n  Waiting for ${confirmations} block confirmations...`);
    await companion.deploymentTransaction().wait(confirmations);
    console.log(`  ${confirmations} confirmations received.`);
  }

  console.log(`\n  SaThuCompanion deployed!`);
  console.log(`   Address:    ${companionAddress}`);
  console.log(`   Tx Hash:    ${receipt.hash}`);
  console.log(`   Block:      ${receipt.blockNumber}`);
  console.log(`   Gas Used:   ${receipt.gasUsed.toString()}`);

  // ─── Verify roles ──────────────────────────────────────────────────
  const DEFAULT_ADMIN_ROLE = await companion.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE = await companion.MINTER_ROLE();

  const adminHasAdmin = await companion.hasRole(DEFAULT_ADMIN_ROLE, admin);
  const minterHasMinter = await companion.hasRole(MINTER_ROLE, minter);

  console.log(`\n  Companion Roles:`);
  console.log(`   Admin:     ${admin} -> ${adminHasAdmin}`);
  console.log(`   Minter:    ${minter} -> ${minterHasMinter}`);
  console.log(`   SaThuCoin: ${await companion.sathu()}`);

  if (!adminHasAdmin || !minterHasMinter) {
    console.error("\n  ROLE VERIFICATION FAILED — roles not set correctly!");
    process.exit(1);
  }

  // ─── Save deployment info ──────────────────────────────────────────
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const companionDeployment = {
    network: network,
    chainId: chainId.toString(),
    companionAddress: companionAddress,
    sathuAddress: sathuAddress,
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

  const companionFile = path.join(dataDir, "companion-deployment.json");
  fs.writeFileSync(companionFile, JSON.stringify(companionDeployment, null, 2));
  console.log(`\n  Deployment info saved to: data/companion-deployment.json`);

  // ─── Post-deploy reminders ─────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log("  IMPORTANT: Next steps (manual)");
  console.log("═══════════════════════════════════════════");
  console.log("  1. Verify on BaseScan:");
  console.log(`     npx hardhat run scripts/verify-companion.js --network ${network}`);
  console.log("");
  console.log("  2. Grant companion MINTER_ROLE on SaThuCoin:");
  console.log(`     sathu.grantRole(MINTER_ROLE, ${companionAddress})`);
  console.log("     This is a SEPARATE manual transaction.");
  console.log("");
  console.log("  3. Smoke test:");
  console.log("     - Mint via companion (mintForDeedTagged)");
  console.log("     - Burn via companion (burnWithOffering)");
  console.log("     - Verify events on BaseScan");
  console.log("═══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error("\n  Deployment failed:", error.message);
  process.exitCode = 1;
});
