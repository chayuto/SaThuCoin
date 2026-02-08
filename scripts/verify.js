const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentFile = path.join(__dirname, "..", "data", "deployment.json");

  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ No deployment.json found. Deploy first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const contractAddress = deployment.contractAddress;
  const network = hre.network.name;

  console.log(`\n🔍 Verifying SaThuCoin on ${network}...`);
  console.log(`   Address: ${contractAddress}`);

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("\n✅ Contract verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified") || error.message.includes("already verified")) {
      console.log("\n✅ Contract is already verified.");
    } else {
      console.error("\n❌ Verification failed:", error.message);
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
});
