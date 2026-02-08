const fs = require("fs");
const path = require("path");
const { createInterface } = require("readline/promises");
const { loadSources, isValidUrl, isValidId, isValidRewardAmount } = require("../scraper/config-loader");

const SOURCES_PATH = path.join(__dirname, "..", "config", "sources.json");

/**
 * Slugifies a name for use as a source ID.
 * Lowercase, spaces to hyphens, strip non-alphanumeric/hyphen characters.
 * @param {string} name
 * @returns {string}
 */
function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("═══════════════════════════════════════════");
  console.log("  SaThuCoin — Add New Source");
  console.log("═══════════════════════════════════════════");

  try {
    // Load existing sources for duplicate check
    let existingSources = [];
    if (fs.existsSync(SOURCES_PATH)) {
      existingSources = loadSources(SOURCES_PATH);
    }
    const existingIds = new Set(existingSources.map((s) => s.id));

    // Prompt: name
    const name = (await rl.question("\n📋 Source name: ")).trim();
    if (!name) {
      throw new Error("Name cannot be empty");
    }

    // Auto-generate ID
    const id = slugify(name);
    if (!isValidId(id) || id.length === 0) {
      throw new Error(`Could not generate a valid ID from name "${name}" (got "${id}")`);
    }
    if (existingIds.has(id)) {
      throw new Error(`Source ID "${id}" already exists. Choose a different name.`);
    }
    console.log(`   Generated ID: ${id}`);

    // Prompt: URL
    const url = (await rl.question("\n🔗 Source URL: ")).trim();
    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL: "${url}" — must be a valid http/https URL`);
    }

    // Prompt: type
    const type = (await rl.question("\n📦 Source type (html/api): ")).trim().toLowerCase();
    if (type !== "html" && type !== "api") {
      throw new Error(`Invalid type: "${type}" — must be "html" or "api"`);
    }

    // Type-specific fields
    let selector, attribute, walletField, headers;

    if (type === "html") {
      selector = (await rl.question("\n🎯 CSS selector: ")).trim();
      if (!selector) {
        throw new Error("CSS selector cannot be empty");
      }
      attribute = (await rl.question("📝 Attribute (e.g. text, data-wallet): ")).trim();
      if (!attribute) {
        throw new Error("Attribute cannot be empty");
      }
    } else {
      walletField = (await rl.question("\n🎯 Wallet field path (e.g. data.donors[].walletAddress): ")).trim();
      if (!walletField) {
        throw new Error("Wallet field cannot be empty");
      }
    }

    // Prompt: reward amount (optional)
    const rewardInput = (await rl.question("\n💰 Reward amount (press Enter for default): ")).trim();
    let rewardAmount;
    if (rewardInput) {
      if (!isValidRewardAmount(rewardInput)) {
        throw new Error(`Invalid reward amount: "${rewardInput}" — must be a positive number`);
      }
      rewardAmount = rewardInput;
    }

    // Prompt: notes (optional)
    const notes = (await rl.question("\n📝 Notes (optional): ")).trim();

    // Build source object
    const newSource = { id, name, url, type };

    if (type === "html") {
      newSource.selector = selector;
      newSource.attribute = attribute;
    } else {
      newSource.walletField = walletField;
    }

    if (rewardAmount) {
      newSource.rewardAmount = rewardAmount;
    }

    newSource.enabled = true;

    if (notes) {
      newSource.notes = notes;
    }

    // Append to sources.json
    existingSources.push(newSource);
    fs.writeFileSync(SOURCES_PATH, JSON.stringify(existingSources, null, 2) + "\n");

    // Confirmation
    console.log("\n═══════════════════════════════════════════");
    console.log("  ✅ Source added successfully!");
    console.log("═══════════════════════════════════════════");
    console.log(`   ID:      ${newSource.id}`);
    console.log(`   Name:    ${newSource.name}`);
    console.log(`   URL:     ${newSource.url}`);
    console.log(`   Type:    ${newSource.type}`);
    if (type === "html") {
      console.log(`   Selector:  ${newSource.selector}`);
      console.log(`   Attribute: ${newSource.attribute}`);
    } else {
      console.log(`   WalletField: ${newSource.walletField}`);
    }
    if (newSource.rewardAmount) {
      console.log(`   Reward:  ${newSource.rewardAmount} SATHU`);
    }
    if (newSource.notes) {
      console.log(`   Notes:   ${newSource.notes}`);
    }
    console.log(`   Enabled: true`);
    console.log("═══════════════════════════════════════════\n");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exitCode = 1;
});
