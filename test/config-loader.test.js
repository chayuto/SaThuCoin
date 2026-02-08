const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { loadSources, loadRewards } = require("../scraper/config-loader");

describe("Config Loader", function () {
  let tmpDir;

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sathucoin-test-"));
  });

  afterEach(function () {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /**
   * Helper: writes a JSON file to the temp directory.
   * @param {string} filename
   * @param {*} data
   * @returns {string} absolute path to the file
   */
  function writeTmp(filename, data) {
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  // ──────────────────────────────────────────
  // VALID HTML SOURCE
  // ──────────────────────────────────────────

  function makeHtmlSource(overrides = {}) {
    return {
      id: "test-charity",
      name: "Test Charity",
      url: "https://example.com/donors",
      type: "html",
      selector: ".donor-wallet",
      attribute: "text",
      enabled: true,
      ...overrides,
    };
  }

  // ──────────────────────────────────────────
  // VALID API SOURCE
  // ──────────────────────────────────────────

  function makeApiSource(overrides = {}) {
    return {
      id: "test-api",
      name: "Test API",
      url: "https://api.example.com/donors",
      type: "api",
      walletField: "data.donors[].wallet",
      enabled: false,
      ...overrides,
    };
  }

  // ══════════════════════════════════════════
  // loadSources()
  // ══════════════════════════════════════════

  describe("loadSources()", function () {
    it("should load a valid HTML source correctly", function () {
      const sources = [makeHtmlSource()];
      const filePath = writeTmp("sources.json", sources);

      const result = loadSources(filePath);
      expect(result).to.deep.equal(sources);
      expect(result).to.have.lengthOf(1);
      expect(result[0].type).to.equal("html");
      expect(result[0].selector).to.equal(".donor-wallet");
      expect(result[0].attribute).to.equal("text");
    });

    it("should load a valid API source correctly", function () {
      const sources = [makeApiSource()];
      const filePath = writeTmp("sources.json", sources);

      const result = loadSources(filePath);
      expect(result).to.deep.equal(sources);
      expect(result).to.have.lengthOf(1);
      expect(result[0].type).to.equal("api");
      expect(result[0].walletField).to.equal("data.donors[].wallet");
    });

    it("should load mixed HTML and API sources", function () {
      const sources = [makeHtmlSource(), makeApiSource()];
      const filePath = writeTmp("sources.json", sources);

      const result = loadSources(filePath);
      expect(result).to.have.lengthOf(2);
      expect(result[0].type).to.equal("html");
      expect(result[1].type).to.equal("api");
    });

    it("should accept an empty array", function () {
      const filePath = writeTmp("sources.json", []);

      const result = loadSources(filePath);
      expect(result).to.deep.equal([]);
    });

    it("should return disabled sources", function () {
      const sources = [makeHtmlSource({ enabled: false })];
      const filePath = writeTmp("sources.json", sources);

      const result = loadSources(filePath);
      expect(result).to.have.lengthOf(1);
      expect(result[0].enabled).to.equal(false);
    });

    it("should ignore unknown fields (forward compatibility)", function () {
      const sources = [makeHtmlSource({ futureField: "hello", version: 2 })];
      const filePath = writeTmp("sources.json", sources);

      const result = loadSources(filePath);
      expect(result).to.have.lengthOf(1);
      expect(result[0].futureField).to.equal("hello");
    });

    it("should accept sources with optional rewardAmount", function () {
      const sources = [makeHtmlSource({ rewardAmount: "50" })];
      const filePath = writeTmp("sources.json", sources);

      const result = loadSources(filePath);
      expect(result[0].rewardAmount).to.equal("50");
    });

    it("should accept sources with optional notes", function () {
      const sources = [makeHtmlSource({ notes: "Test notes" })];
      const filePath = writeTmp("sources.json", sources);

      const result = loadSources(filePath);
      expect(result[0].notes).to.equal("Test notes");
    });

    it("should accept API sources with optional headers", function () {
      const sources = [makeApiSource({ headers: { "X-API-Key": "abc123" } })];
      const filePath = writeTmp("sources.json", sources);

      const result = loadSources(filePath);
      expect(result[0].headers).to.deep.equal({ "X-API-Key": "abc123" });
    });

    // ── Missing required fields ──

    it("should throw if id is missing", function () {
      const sources = [makeHtmlSource()];
      delete sources[0].id;
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"id" is required/);
    });

    it("should throw if name is missing", function () {
      const sources = [makeHtmlSource({ name: "" })];
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"name" is required/);
    });

    it("should throw if url is missing", function () {
      const sources = [makeHtmlSource()];
      delete sources[0].url;
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"url" is required/);
    });

    it("should throw if type is missing", function () {
      const sources = [makeHtmlSource()];
      delete sources[0].type;
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"type" must be "html" or "api"/);
    });

    it("should throw if enabled is missing", function () {
      const sources = [makeHtmlSource()];
      delete sources[0].enabled;
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"enabled" is required/);
    });

    // ── Invalid field values ──

    it("should throw if type is invalid", function () {
      const sources = [makeHtmlSource({ type: "rss" })];
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"type" must be "html" or "api"/);
    });

    it("should throw if url is invalid", function () {
      const sources = [makeHtmlSource({ url: "not-a-url" })];
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"url" must be a valid http\/https URL/);
    });

    it("should throw if url has ftp protocol", function () {
      const sources = [makeHtmlSource({ url: "ftp://example.com/donors" })];
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"url" must be a valid http\/https URL/);
    });

    it("should throw if id format is invalid (uppercase)", function () {
      const sources = [makeHtmlSource({ id: "Test-Charity" })];
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"id" must match \[a-z0-9-\]/);
    });

    it("should throw if id format is invalid (spaces)", function () {
      const sources = [makeHtmlSource({ id: "test charity" })];
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"id" must match \[a-z0-9-\]/);
    });

    it("should throw if id is empty string", function () {
      const sources = [makeHtmlSource({ id: "" })];
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"id" is required/);
    });

    it("should throw on duplicate IDs", function () {
      const sources = [
        makeHtmlSource({ id: "same-id" }),
        makeApiSource({ id: "same-id" }),
      ];
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/Duplicate source ID: "same-id"/);
    });

    // ── Type-specific missing fields ──

    it("should throw if HTML source is missing selector", function () {
      const source = makeHtmlSource();
      delete source.selector;
      const filePath = writeTmp("sources.json", [source]);

      expect(() => loadSources(filePath)).to.throw(/"selector" is required for type "html"/);
    });

    it("should throw if HTML source is missing attribute", function () {
      const source = makeHtmlSource();
      delete source.attribute;
      const filePath = writeTmp("sources.json", [source]);

      expect(() => loadSources(filePath)).to.throw(/"attribute" is required for type "html"/);
    });

    it("should throw if API source is missing walletField", function () {
      const source = makeApiSource();
      delete source.walletField;
      const filePath = writeTmp("sources.json", [source]);

      expect(() => loadSources(filePath)).to.throw(/"walletField" is required for type "api"/);
    });

    // ── Invalid rewardAmount ──

    it('should throw if rewardAmount is "0"', function () {
      const sources = [makeHtmlSource({ rewardAmount: "0" })];
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"rewardAmount" must be a positive numeric string/);
    });

    it('should throw if rewardAmount is "abc"', function () {
      const sources = [makeHtmlSource({ rewardAmount: "abc" })];
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"rewardAmount" must be a positive numeric string/);
    });

    it('should throw if rewardAmount is "-5"', function () {
      const sources = [makeHtmlSource({ rewardAmount: "-5" })];
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"rewardAmount" must be a positive numeric string/);
    });

    // ── File-level errors ──

    it("should throw if file does not exist", function () {
      const filePath = path.join(tmpDir, "nonexistent.json");

      expect(() => loadSources(filePath)).to.throw(/Sources config not found/);
    });

    it("should throw if file is not valid JSON", function () {
      const filePath = path.join(tmpDir, "bad.json");
      fs.writeFileSync(filePath, "not json at all");

      expect(() => loadSources(filePath)).to.throw(/Sources config is not valid JSON/);
    });

    it("should throw if file is a JSON object instead of array", function () {
      const filePath = writeTmp("sources.json", { id: "oops" });

      expect(() => loadSources(filePath)).to.throw(/Sources config must be a JSON array/);
    });

    it("should throw if enabled is a string instead of boolean", function () {
      const sources = [makeHtmlSource({ enabled: "true" })];
      const filePath = writeTmp("sources.json", sources);

      expect(() => loadSources(filePath)).to.throw(/"enabled" is required and must be a boolean/);
    });
  });

  // ══════════════════════════════════════════
  // loadRewards()
  // ══════════════════════════════════════════

  describe("loadRewards()", function () {
    function makeRewards(overrides = {}) {
      return {
        defaultReward: "10",
        decimals: 18,
        dryRun: false,
        maxMintsPerCycle: 50,
        cooldownMinutes: 5,
        ...overrides,
      };
    }

    it("should load a valid rewards config correctly", function () {
      const rewards = makeRewards();
      const filePath = writeTmp("rewards.json", rewards);

      const result = loadRewards(filePath);
      expect(result).to.deep.equal(rewards);
    });

    it("should accept dryRun as true", function () {
      const rewards = makeRewards({ dryRun: true });
      const filePath = writeTmp("rewards.json", rewards);

      const result = loadRewards(filePath);
      expect(result.dryRun).to.equal(true);
    });

    it("should accept cooldownMinutes as 0", function () {
      const rewards = makeRewards({ cooldownMinutes: 0 });
      const filePath = writeTmp("rewards.json", rewards);

      const result = loadRewards(filePath);
      expect(result.cooldownMinutes).to.equal(0);
    });

    it("should accept decimals as 0", function () {
      const rewards = makeRewards({ decimals: 0 });
      const filePath = writeTmp("rewards.json", rewards);

      const result = loadRewards(filePath);
      expect(result.decimals).to.equal(0);
    });

    // ── Missing fields ──

    it("should throw if defaultReward is missing", function () {
      const rewards = makeRewards();
      delete rewards.defaultReward;
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"defaultReward" must be a positive numeric string/);
    });

    it("should throw if decimals is missing", function () {
      const rewards = makeRewards();
      delete rewards.decimals;
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"decimals" must be an integer/);
    });

    it("should throw if dryRun is missing", function () {
      const rewards = makeRewards();
      delete rewards.dryRun;
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"dryRun" must be a boolean/);
    });

    it("should throw if maxMintsPerCycle is missing", function () {
      const rewards = makeRewards();
      delete rewards.maxMintsPerCycle;
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"maxMintsPerCycle" must be a positive integer/);
    });

    it("should throw if cooldownMinutes is missing", function () {
      const rewards = makeRewards();
      delete rewards.cooldownMinutes;
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"cooldownMinutes" must be a non-negative number/);
    });

    // ── Invalid types ──

    it("should throw if defaultReward is a number instead of string", function () {
      const rewards = makeRewards({ defaultReward: 10 });
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"defaultReward" must be a positive numeric string/);
    });

    it('should throw if defaultReward is "0"', function () {
      const rewards = makeRewards({ defaultReward: "0" });
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"defaultReward" must be a positive numeric string/);
    });

    it("should throw if decimals is 19 (out of range)", function () {
      const rewards = makeRewards({ decimals: 19 });
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"decimals" must be an integer between 0 and 18/);
    });

    it("should throw if decimals is a float", function () {
      const rewards = makeRewards({ decimals: 1.5 });
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"decimals" must be an integer between 0 and 18/);
    });

    it("should throw if dryRun is a string", function () {
      const rewards = makeRewards({ dryRun: "false" });
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"dryRun" must be a boolean/);
    });

    it("should throw if maxMintsPerCycle is 0", function () {
      const rewards = makeRewards({ maxMintsPerCycle: 0 });
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"maxMintsPerCycle" must be a positive integer/);
    });

    it("should throw if maxMintsPerCycle is negative", function () {
      const rewards = makeRewards({ maxMintsPerCycle: -1 });
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"maxMintsPerCycle" must be a positive integer/);
    });

    it("should throw if cooldownMinutes is negative", function () {
      const rewards = makeRewards({ cooldownMinutes: -1 });
      const filePath = writeTmp("rewards.json", rewards);

      expect(() => loadRewards(filePath)).to.throw(/"cooldownMinutes" must be a non-negative number/);
    });

    // ── File-level errors ──

    it("should throw if file does not exist", function () {
      const filePath = path.join(tmpDir, "nonexistent.json");

      expect(() => loadRewards(filePath)).to.throw(/Rewards config not found/);
    });

    it("should throw if file is not valid JSON", function () {
      const filePath = path.join(tmpDir, "bad.json");
      fs.writeFileSync(filePath, "{{bad}");

      expect(() => loadRewards(filePath)).to.throw(/Rewards config is not valid JSON/);
    });

    it("should throw if file is an array instead of object", function () {
      const filePath = writeTmp("rewards.json", []);

      expect(() => loadRewards(filePath)).to.throw(/Rewards config must be a JSON object/);
    });
  });
});
