const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const companionFile = path.join(__dirname, "..", "data", "companion-deployment.json");

  if (!fs.existsSync(companionFile)) {
    console.error("  No companion-deployment.json found. Deploy the companion first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(companionFile, "utf-8"));
  const companionAddress = deployment.companionAddress;
  const network = hre.network.name;

  // Validate deployment matches current network
  if (deployment.network !== network) {
    console.error(
      `  Network mismatch: companion-deployment.json is for "${deployment.network}" but running on "${network}".`
    );
    process.exit(1);
  }

  console.log(`\n  Verifying SaThuCompanion on ${network}...`);
  console.log(`   Address:   ${companionAddress}`);
  console.log(`   SaThuCoin: ${deployment.sathuAddress}`);
  console.log(`   Admin:     ${deployment.admin}`);
  console.log(`   Minter:    ${deployment.minter}`);

  try {
    await hre.run("verify:verify", {
      address: companionAddress,
      constructorArguments: [
        deployment.sathuAddress,
        deployment.admin,
        deployment.minter,
      ],
    });
    console.log("\n  Companion verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified") || error.message.includes("already verified")) {
      console.log("\n  Companion is already verified.");
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
