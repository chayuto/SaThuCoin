// Hardhat task: mint SATHU tokens
// Usage:
//   npx hardhat mint --to 0xABC... --amount 10 --network base-sepolia
//   npx hardhat mint --to 0xABC... --amount 10 --deed "Donated to Red Cross" --network base-sepolia
//   npx hardhat mint --to 0xABC... --amount 10 --dry-run --network base-sepolia

const { task } = require("hardhat/config");
const fs = require("fs");
const path = require("path");

task("mint", "Mint SATHU tokens to an address")
  .addParam("to", "Recipient address (EIP-55 checksummed)")
  .addParam("amount", "Amount to mint in SATHU (e.g. 10 = 10 SATHU)")
  .addOptionalParam("deed", "Short description of the deed (uses mintForDeed)")
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

    // Validate amount
    const amountFloat = parseFloat(taskArgs.amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      console.error(`  Invalid amount: "${taskArgs.amount}". Must be a positive number.`);
      process.exit(1);
    }

    const amount = hre.ethers.parseEther(taskArgs.amount);
    const maxPerTx = 10_000n * 10n ** 18n; // MAX_MINT_PER_TX
    if (amount > maxPerTx) {
      console.error(`  Amount ${taskArgs.amount} SATHU exceeds MAX_MINT_PER_TX (10,000 SATHU).`);
      process.exit(1);
    }

    const deed = taskArgs.deed || null;
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
    console.log(`  Amount:    ${taskArgs.amount} SATHU`);
    if (deed) {
      console.log(`  Deed:      "${deed}"`);
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
