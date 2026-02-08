const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentFile = path.join(__dirname, "..", "data", "deployment.json");

  if (!fs.existsSync(deploymentFile)) {
    console.error("  No deployment.json found. Deploy first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const contractAddress = deployment.contractAddress;
  const network = hre.network.name;

  // Validate deployment matches current network
  if (deployment.network !== network) {
    console.error(`  Network mismatch: deployment.json is for "${deployment.network}" but running on "${network}".`);
    process.exit(1);
  }

  console.log(`\n  Verifying SaThuCoin on ${network}...`);
  console.log(`   Address: ${contractAddress}`);
  console.log(`   Admin:   ${deployment.admin}`);
  console.log(`   Minter:  ${deployment.minter}`);

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [deployment.admin, deployment.minter],
    });
    console.log("\n  Contract verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified") || error.message.includes("already verified")) {
      console.log("\n  Contract is already verified.");
    } else {
      console.error("\n  Verification failed:", error.message);
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error("  Error:", error.message);
  process.exitCode = 1;
});
