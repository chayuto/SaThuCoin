// Hardhat task: mint SATHU tokens
// Usage:
//   npx hardhat mint --to 0xABC... --amount 10 --network base-sepolia
//   npx hardhat mint --to 0xABC... --amount 10 --deed "Donated to Red Cross" --network base-sepolia
//   npx hardhat mint --to 0xABC... --amount 1boon --deed "First boon" --network base-sepolia
//   npx hardhat mint --to 0xABC... --amount 500boon --deed-file deed.txt --network base-mainnet
//   npx hardhat mint --to 0xABC... --amount 10 --dry-run --network base-sepolia

const { task } = require("hardhat/config");
const fs = require("fs");
const path = require("path");

/**
 * Parse the --amount argument.
 * Supports: "10" (SATHU), "0.5" (SATHU), "1boon" (raw units), "500boon" (raw units)
 * @param {string} raw
 * @param {object} ethers - hardhat ethers
 * @returns {{ amount: bigint, display: string }}
 */
function parseAmount(raw, ethers) {
  const trimmed = raw.trim().toLowerCase();

  if (trimmed.endsWith("boon")) {
    const num = trimmed.slice(0, -4);
    if (!num || !/^\d+$/.test(num)) {
      throw new Error(`Invalid boon amount: "${raw}" — must be a positive integer followed by "boon"`);
    }
    const amount = BigInt(num);
    const sathu = ethers.formatEther(amount);
    return { amount, display: `${num} boon (${sathu} SATHU)` };
  }

  // Treat as SATHU (human-readable, 18 decimals)
  const amountFloat = parseFloat(trimmed);
  if (isNaN(amountFloat) || amountFloat < 0) {
    throw new Error(`Invalid amount: "${raw}" — must be a positive number or integer with "boon" suffix`);
  }

  const amount = ethers.parseEther(trimmed);
  return { amount, display: `${trimmed} SATHU (${amount} boon)` };
}

task("mint", "Mint SATHU tokens to an address")
  .addParam("to", "Recipient address (EIP-55 checksummed)")
  .addParam("amount", "Amount to mint: SATHU (e.g. 10) or boon (e.g. 1boon, 500boon)")
  .addOptionalParam("deed", "Description of the deed (uses mintForDeed)")
  .addOptionalParam("deedFile", "Path to a text file containing the deed")
  .addFlag("dryRun", "Simulate without sending a transaction")
  .setAction(async (taskArgs, hre) => {
    const network = hre.network.name;

    // Reject on default hardhat network (ephemeral — tx would be lost)
    if (network === "hardhat") {
      console.error("  Cannot mint on the ephemeral hardhat network.");
      console.error("  Use --network base-sepolia or --network localhost");
      process.exit(1);
    }

    // Load deployment info
    const deploymentFile = path.join(__dirname, "..", "data", "deployment.json");
    if (!fs.existsSync(deploymentFile)) {
      console.error("  No deployment.json found. Deploy first.");
      process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));

    if (deployment.network !== network) {
      console.error(`  Network mismatch: deployment is on "${deployment.network}" but running on "${network}".`);
      process.exit(1);
    }

    // Validate recipient address (EIP-55 checksum)
    let to;
    try {
      to = hre.ethers.getAddress(taskArgs.to);
    } catch {
      console.error(`  Invalid address: "${taskArgs.to}"`);
      console.error("  Must be a valid EIP-55 checksummed Ethereum address.");
      process.exit(1);
    }

    if (to === hre.ethers.ZeroAddress) {
      console.error("  Cannot mint to the zero address.");
      process.exit(1);
    }

    // Parse amount (supports SATHU and boon)
    let amount, amountDisplay;
    try {
      const parsed = parseAmount(taskArgs.amount, hre.ethers);
      amount = parsed.amount;
      amountDisplay = parsed.display;
    } catch (e) {
      console.error(`  ${e.message}`);
      process.exit(1);
    }

    if (amount === 0n) {
      console.error("  Amount must be greater than 0.");
      process.exit(1);
    }

    const maxPerTx = 10_000n * 10n ** 18n; // MAX_MINT_PER_TX
    if (amount > maxPerTx) {
      console.error(`  Amount exceeds MAX_MINT_PER_TX (10,000 SATHU).`);
      process.exit(1);
    }

    // Load deed from --deed or --deed-file
    let deed = taskArgs.deed || null;
    if (taskArgs.deedFile) {
      const filePath = path.resolve(taskArgs.deedFile);
      if (!fs.existsSync(filePath)) {
        console.error(`  Deed file not found: ${filePath}`);
        process.exit(1);
      }
      deed = fs.readFileSync(filePath, "utf-8").trim();
    }

    const dryRun = taskArgs.dryRun;

    // Connect to contract
    const [signer] = await hre.ethers.getSigners();
    const token = await hre.ethers.getContractAt("SaThuCoin", deployment.contractAddress, signer);

    // Verify signer has MINTER_ROLE
    const MINTER_ROLE = await token.MINTER_ROLE();
    const hasMinterRole = await token.hasRole(MINTER_ROLE, signer.address);
    if (!hasMinterRole) {
      console.error(`  Signer ${signer.address} does not have MINTER_ROLE.`);
      console.error("  Only accounts with MINTER_ROLE can mint tokens.");
      process.exit(1);
    }

    // Check if contract is paused
    const paused = await token.paused();
    if (paused) {
      console.error("  Contract is paused. Cannot mint.");
      process.exit(1);
    }

    // Display summary
    console.log("\n═══════════════════════════════════════════");
    console.log("  SaThuCoin Mint");
    console.log("═══════════════════════════════════════════");
    console.log(`  Network:   ${network}`);
    console.log(`  Contract:  ${deployment.contractAddress}`);
    console.log(`  Signer:    ${signer.address}`);
    console.log(`  Recipient: ${to}`);
    console.log(`  Amount:    ${amountDisplay}`);
    if (deed) {
      const deedPreview = deed.length > 80 ? deed.slice(0, 77) + "..." : deed;
      console.log(`  Deed:      "${deedPreview}"`);
      console.log(`  Function:  mintForDeed()`);
    } else {
      console.log(`  Function:  mint()`);
    }
    if (dryRun) {
      console.log(`  Mode:      DRY RUN (no transaction sent)`);
    }
    console.log("═══════════════════════════════════════════");

    if (dryRun) {
      // Estimate gas for dry run
      let gasEstimate;
      if (deed) {
        gasEstimate = await token.mintForDeed.estimateGas(to, amount, deed);
      } else {
        gasEstimate = await token.mint.estimateGas(to, amount);
      }
      console.log(`\n  Gas estimate: ${gasEstimate.toString()}`);
      console.log("  Dry run complete. No transaction sent.");
      return;
    }

    // Execute mint
    console.log("\n  Sending transaction...");
    let tx;
    if (deed) {
      tx = await token.mintForDeed(to, amount, deed);
    } else {
      tx = await token.mint(to, amount);
    }

    console.log(`  Tx hash: ${tx.hash}`);
    console.log("  Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`\n  Mint successful!`);
    console.log(`   Block:    ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

    // Show updated balance
    const balance = await token.balanceOf(to);
    const supply = await token.totalSupply();
    console.log(`\n  Recipient balance: ${hre.ethers.formatEther(balance)} SATHU`);
    console.log(`  Total supply:      ${hre.ethers.formatEther(supply)} SATHU`);

    console.log("\n═══════════════════════════════════════════\n");
  });
