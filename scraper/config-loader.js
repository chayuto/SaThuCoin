const fs = require("fs");
const path = require("path");

const SOURCES_DEFAULT_PATH = path.join(__dirname, "..", "config", "sources.json");
const REWARDS_DEFAULT_PATH = path.join(__dirname, "..", "config", "rewards.json");

// ──────────────────────────────────────────
// Validation helpers
// ──────────────────────────────────────────

/**
 * Validates a URL string is a valid http or https URL.
 * @param {string} urlStr
 * @returns {boolean}
 */
function isValidUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates a source ID matches the slug format [a-z0-9-]+.
 * @param {string} id
 * @returns {boolean}
 */
function isValidId(id) {
  return typeof id === "string" && /^[a-z0-9-]+$/.test(id);
}

/**
 * Validates a rewardAmount string is a positive numeric value.
 * @param {string} value
 * @returns {boolean}
 */
function isValidRewardAmount(value) {
  if (typeof value !== "string") return false;
  const num = Number(value);
  return !isNaN(num) && isFinite(num) && num > 0;
}

/**
 * Validates a single source object. Throws descriptive errors.
 * @param {object} source
 * @param {number} index — position in the array (for error messages)
 */
function validateSource(source, index) {
  const prefix = source.id
    ? `Source "${source.id}"`
    : `Source at index ${index}`;

  // Required fields — presence and type checks
  if (typeof source.id !== "string" || source.id.length === 0) {
    throw new Error(`${prefix}: "id" is required and must be a non-empty string`);
  }
  if (!isValidId(source.id)) {
    throw new Error(
      `Source "${source.id}": "id" must match [a-z0-9-]+ (got "${source.id}")`
    );
  }
  if (typeof source.name !== "string" || source.name.length === 0) {
    throw new Error(`Source "${source.id}": "name" is required and must be a non-empty string`);
  }
  if (typeof source.url !== "string" || source.url.length === 0) {
    throw new Error(`Source "${source.id}": "url" is required and must be a non-empty string`);
  }
  if (!isValidUrl(source.url)) {
    throw new Error(`Source "${source.id}": "url" must be a valid http/https URL (got "${source.url}")`);
  }
  if (source.type !== "html" && source.type !== "api") {
    throw new Error(
      `Source "${source.id}": "type" must be "html" or "api" (got "${source.type}")`
    );
  }
  if (typeof source.enabled !== "boolean") {
    throw new Error(`Source "${source.id}": "enabled" is required and must be a boolean`);
  }

  // Type-specific fields
  if (source.type === "html") {
    if (typeof source.selector !== "string" || source.selector.length === 0) {
      throw new Error(
        `Source "${source.id}": "selector" is required for type "html" and must be a non-empty string`
      );
    }
    if (typeof source.attribute !== "string" || source.attribute.length === 0) {
      throw new Error(
        `Source "${source.id}": "attribute" is required for type "html" and must be a non-empty string`
      );
    }
  }

  if (source.type === "api") {
    if (typeof source.walletField !== "string" || source.walletField.length === 0) {
      throw new Error(
        `Source "${source.id}": "walletField" is required for type "api" and must be a non-empty string`
      );
    }
  }

  // Optional fields — validate only if present
  if (source.rewardAmount !== undefined) {
    if (!isValidRewardAmount(source.rewardAmount)) {
      throw new Error(
        `Source "${source.id}": "rewardAmount" must be a positive numeric string (got "${source.rewardAmount}")`
      );
    }
  }

  if (source.headers !== undefined) {
    if (
      typeof source.headers !== "object" ||
      source.headers === null ||
      Array.isArray(source.headers)
    ) {
      throw new Error(
        `Source "${source.id}": "headers" must be a plain object`
      );
    }
  }

  if (source.notes !== undefined) {
    if (typeof source.notes !== "string") {
      throw new Error(
        `Source "${source.id}": "notes" must be a string`
      );
    }
  }
}

// ──────────────────────────────────────────
// Public API
// ──────────────────────────────────────────

/**
 * Loads and validates config/sources.json.
 * @param {string} [filePath] — override path for testing
 * @returns {Array} — array of source objects (enabled + disabled)
 */
function loadSources(filePath) {
  const resolvedPath = filePath || SOURCES_DEFAULT_PATH;

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Sources config not found: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, "utf-8");
  let sources;
  try {
    sources = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Sources config is not valid JSON: ${err.message}`);
  }

  if (!Array.isArray(sources)) {
    throw new Error("Sources config must be a JSON array");
  }

  // Validate each source
  const seenIds = new Set();
  for (let i = 0; i < sources.length; i++) {
    validateSource(sources[i], i);

    // Check for duplicate IDs
    if (seenIds.has(sources[i].id)) {
      throw new Error(`Duplicate source ID: "${sources[i].id}"`);
    }
    seenIds.add(sources[i].id);
  }

  return sources;
}

/**
 * Loads and validates config/rewards.json.
 * @param {string} [filePath] — override path for testing
 * @returns {object} — the parsed rewards config
 */
function loadRewards(filePath) {
  const resolvedPath = filePath || REWARDS_DEFAULT_PATH;

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Rewards config not found: ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, "utf-8");
  let rewards;
  try {
    rewards = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Rewards config is not valid JSON: ${err.message}`);
  }

  if (typeof rewards !== "object" || rewards === null || Array.isArray(rewards)) {
    throw new Error("Rewards config must be a JSON object");
  }

  // defaultReward — positive numeric string
  if (typeof rewards.defaultReward !== "string" || !isValidRewardAmount(rewards.defaultReward)) {
    throw new Error(
      `Rewards config: "defaultReward" must be a positive numeric string (got "${rewards.defaultReward}")`
    );
  }

  // decimals — integer 0–18
  if (
    typeof rewards.decimals !== "number" ||
    !Number.isInteger(rewards.decimals) ||
    rewards.decimals < 0 ||
    rewards.decimals > 18
  ) {
    throw new Error(
      `Rewards config: "decimals" must be an integer between 0 and 18 (got ${rewards.decimals})`
    );
  }

  // dryRun — boolean
  if (typeof rewards.dryRun !== "boolean") {
    throw new Error(
      `Rewards config: "dryRun" must be a boolean (got ${typeof rewards.dryRun})`
    );
  }

  // maxMintsPerCycle — positive integer
  if (
    typeof rewards.maxMintsPerCycle !== "number" ||
    !Number.isInteger(rewards.maxMintsPerCycle) ||
    rewards.maxMintsPerCycle <= 0
  ) {
    throw new Error(
      `Rewards config: "maxMintsPerCycle" must be a positive integer (got ${rewards.maxMintsPerCycle})`
    );
  }

  // cooldownMinutes — non-negative number
  if (
    typeof rewards.cooldownMinutes !== "number" ||
    rewards.cooldownMinutes < 0
  ) {
    throw new Error(
      `Rewards config: "cooldownMinutes" must be a non-negative number (got ${rewards.cooldownMinutes})`
    );
  }

  return rewards;
}

module.exports = { loadSources, loadRewards, isValidUrl, isValidId, isValidRewardAmount };
