# SaThuCoin (SATHU) — Project Plan

> A feel-good, fictional ERC-20 token that automatically rewards people who donate to public causes.
> Scrapes public charity donor lists. Finds wallet addresses. Mints SATHU to donors.
> Open source. Agentic-first. Built for fun, not profit.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [How It Works](#how-it-works)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Repository Structure](#repository-structure)
6. [Development Phases](#development-phases)
7. [Smart Contract Specification](#smart-contract-specification)
8. [Scraper Specification](#scraper-specification)
9. [Source Site Configuration](#source-site-configuration)
10. [Deduplication & State Management](#deduplication--state-management)
11. [Deployment Guide](#deployment-guide)
12. [Agentic Development Guide](#agentic-development-guide)
13. [Security Considerations](#security-considerations)
14. [Future Roadmap](#future-roadmap)
15. [License](#license)

---

## Project Overview

**Name:** SaThuCoin
**Symbol:** SATHU
**Standard:** ERC-20
**Chain:** Base (Ethereum L2)
**Supply:** Uncapped — grows with every verified donation
**Initial Supply:** 0 — all tokens are earned, never pre-minted
**Minting Model:** Automated via scraper + manual override via CLI
**License:** MIT
**Purpose:** Fictional, fun token. Not a financial instrument. No monetary value intended.

### Core Philosophy

- Every SATHU in existence represents a real donation someone made to a public cause
- No manual submissions — the system finds donors automatically from public data
- Fully transparent, open source, auditable
- The total supply is a living counter of generosity

### Key Decisions

| Decision                | Choice                                              |
|------------------------|------------------------------------------------------|
| Polling frequency      | Both — auto scheduled (cron) + manual trigger         |
| Reward model           | Per-source rates — each source site has its own SATHU reward |
| Scraping method        | Flexible — HTML scraping (Cheerio) + API support per site |
| Deduplication          | Local state file tracking all seen wallet+source pairs |
| Repo structure         | Monorepo — contracts, scraper, CLI, docs all in one   |

---

## How It Works

```
1. You curate a list of public charity/organization websites
   that voluntarily publish donor lists with wallet addresses.

2. Your scraper periodically visits these websites
   and extracts wallet addresses from their donor pages.

3. The scraper compares found wallets against its local state
   to identify NEW donors it hasn't rewarded yet.

4. For each new donor, the scraper calls mintForDeed()
   on the SaThuCoin contract, sending SATHU to the donor's wallet.

5. The mint is logged, the donor is marked as "rewarded",
   and the cycle repeats.
```

**The donor does nothing.** They donate to a cause they care about. SATHU shows up in their wallet as a thank-you from the universe.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   SOURCE WEBSITES                        │
│                                                          │
│   charity-a.org/donors    ngo-b.org/supporters           │
│   dao-c.xyz/contributors  fund-d.io/public-donors        │
│                                                          │
│   Each publishes donor wallet addresses publicly         │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTP GET / API call
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  SCRAPER ENGINE                           │
│                                                          │
│   For each source site:                                  │
│   1. Fetch page / call API                               │
│   2. Parse wallet addresses using site-specific adapter  │
│   3. Compare against seen-wallets state                  │
│   4. Filter to NEW wallets only                          │
│                                                          │
│   Adapters:                                              │
│   ├── html-adapter (Cheerio-based DOM parsing)           │
│   └── api-adapter (JSON API response parsing)            │
└──────────────────────┬──────────────────────────────────┘
                       │  new wallets found
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  MINTER ENGINE                            │
│                                                          │
│   For each new wallet:                                   │
│   1. Look up reward amount from source config            │
│   2. Call mintForDeed(wallet, amount, sourceName)         │
│   3. Wait for tx confirmation                            │
│   4. Update seen-wallets state                           │
│   5. Append to mint-log                                  │
│                                                          │
│   Handles: gas estimation, retries, error logging        │
└──────────────────────┬──────────────────────────────────┘
                       │  mintForDeed()
                       ▼
┌─────────────────────────────────────────────────────────┐
│              SATHUCOIN CONTRACT (Base)                    │
│                                                          │
│   ERC-20 + Ownable + Mintable                            │
│   - mintForDeed(address, amount, deed) → onlyOwner       │
│   - Emits DeedRewarded event                             │
│   - No cap, no initial supply                            │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer        | Technology             | Why                                          |
|-------------|------------------------|----------------------------------------------|
| Chain       | Base                   | Cheap gas (cents), EVM, growing ecosystem     |
| Contract    | Solidity ^0.8.20       | Industry standard for ERC-20                  |
| Libraries   | OpenZeppelin 5.x       | Audited, battle-tested contract modules       |
| Dev Frame   | Hardhat                | Testing, deployment, verification             |
| Scraper     | Node.js + Cheerio      | Lightweight HTML parsing, no browser needed   |
| API calls   | Node.js + axios/fetch  | For sites that expose APIs                    |
| Minter      | Node.js + ethers.js v6 | Contract interaction                          |
| Scheduler   | node-cron              | Scheduled polling                             |
| Testing     | Hardhat + Chai         | Contract tests                                |
| Testing     | Jest / Vitest          | Scraper and minter unit tests                 |
| Testnet     | Base Sepolia           | Free testing environment                      |
| Wallet      | MetaMask               | Deployment and interaction                    |
| VCS         | Git + GitHub           | Public open source repo                       |

---

## Repository Structure

```
sathucoin/
├── README.md                       # Project intro, how it works, philosophy
├── PROJECT_PLAN.md                 # This file
├── LICENSE                         # MIT
├── CONTRIBUTING.md                 # How others can contribute
├── .gitignore
├── .env.example                    # Template for secrets
│
├── contracts/
│   └── SaThuCoin.sol               # The token contract
│
├── test/
│   ├── SaThuCoin.test.js           # Contract unit tests
│   └── scraper.test.js             # Scraper unit tests
│
├── scripts/
│   ├── deploy.js                   # Hardhat deployment script
│   └── verify.js                   # BaseScan verification script
│
├── scraper/
│   ├── index.js                    # Main entry — runs full scrape+mint cycle
│   ├── scheduler.js                # Cron-based auto polling
│   ├── engine.js                   # Core scrape logic — iterate sources, find new wallets
│   ├── minter.js                   # Calls mintForDeed on contract
│   ├── adapters/
│   │   ├── html.js                 # Cheerio-based HTML scraper
│   │   ├── api.js                  # JSON API adapter
│   │   └── base.js                 # Base adapter interface
│   ├── state/
│   │   ├── manager.js              # Read/write seen-wallets state
│   │   └── seen-wallets.json       # Persistent state (gitignored)
│   └── utils/
│       ├── logger.js               # Structured logging
│       ├── wallet-validator.js     # Validate Ethereum addresses
│       └── retry.js                # Retry logic for failed txs
│
├── cli/
│   ├── mint.js                     # Manual mint: node cli/mint.js --to 0x... --amount 50
│   ├── scrape.js                   # Manual scrape trigger: node cli/scrape.js
│   ├── balance.js                  # Check SATHU balance of address
│   ├── supply.js                   # Check total SATHU supply
│   └── add-source.js              # Add a new source site to config
│
├── config/
│   ├── sources.json                # Source site definitions
│   └── rewards.json                # Default reward amounts
│
├── data/                           # All gitignored
│   ├── mint-log.json               # Every mint ever made
│   └── scrape-log.json             # Every scrape cycle result
│
├── docs/
│   ├── SETUP.md                    # Full environment setup
│   ├── DEPLOYMENT.md               # Deploy to testnet and mainnet
│   ├── CLI_USAGE.md                # All CLI commands
│   ├── ADDING_SOURCES.md           # How to add a new source website
│   └── ARCHITECTURE.md             # Technical deep dive
│
├── hardhat.config.js
├── package.json
└── package-lock.json
```

---

## Development Phases

### Phase 1 — Environment Setup

**Goal:** Working local dev environment.

**Tasks:**
- [ ] Initialize Node.js project (`npm init`)
- [ ] Install Hardhat, OpenZeppelin, ethers.js v6, dotenv
- [ ] Install scraper deps: cheerio, axios, node-cron
- [ ] Initialize Hardhat project (JavaScript config)
- [ ] Create `.env.example` with placeholder keys
- [ ] Create `.gitignore` (node_modules, .env, data/, artifacts, cache)
- [ ] Create `hardhat.config.js` with Base Sepolia + Base Mainnet networks
- [ ] Verify `npx hardhat compile` works

**Agentic Prompt:**
```
Set up a Hardhat + Node.js monorepo project for SaThuCoin.

Install dev dependencies: hardhat, @nomicfoundation/hardhat-toolbox
Install production dependencies: @openzeppelin/contracts, ethers v6, dotenv,
  cheerio, axios, node-cron

Configure hardhat.config.js:
  - Solidity 0.8.20
  - Networks:
    - baseSepolia: chainId 84532, RPC https://sepolia.base.org
    - baseMainnet: chainId 8453, RPC https://mainnet.base.org
  - Etherscan (BaseScan) verification config for Base
  - All secrets loaded from .env via dotenv

Create .env.example:
  PRIVATE_KEY=your_private_key_here
  CONTRACT_ADDRESS=deployed_contract_address_here
  RPC_URL=https://sepolia.base.org
  BASESCAN_API_KEY=your_basescan_api_key_here

Create .gitignore covering: node_modules, .env, artifacts, cache,
  data/*.json, coverage, typechain-types

Verify everything compiles with: npx hardhat compile
```

---

### Phase 2 — Smart Contract

**Goal:** A complete, tested, deployable SaThuCoin ERC-20 contract.

**Tasks:**
- [ ] Write `contracts/SaThuCoin.sol`
- [ ] Write comprehensive tests in `test/SaThuCoin.test.js`
- [ ] All tests pass with `npx hardhat test`

**Test Cases:**
- [ ] Deployment: correct name ("SaThuCoin") and symbol ("SATHU")
- [ ] Initial total supply is 0
- [ ] Owner can mint tokens to any address
- [ ] Non-owner cannot mint (reverts)
- [ ] `mintForDeed` emits `DeedRewarded` event with correct args
- [ ] Multiple mints accumulate in total supply
- [ ] Token transfers work after minting
- [ ] Ownership transfer works, new owner can mint, old owner cannot
- [ ] Mint to multiple different addresses works correctly

**Agentic Prompt:**
```
Create contracts/SaThuCoin.sol — an ERC-20 token using OpenZeppelin 5.x.

Requirements:
  - Name: "SaThuCoin", Symbol: "SATHU"
  - Inherits ERC20 and Ownable from OpenZeppelin
  - No initial supply, no cap
  - Function: mint(address to, uint256 amount) external onlyOwner
  - Function: mintForDeed(address to, uint256 amount, string calldata deed) external onlyOwner
  - Event: DeedRewarded(address indexed recipient, uint256 amount, string deed)
  - mintForDeed calls _mint then emits DeedRewarded
  - Constructor passes msg.sender to Ownable

Then create test/SaThuCoin.test.js using Hardhat + Chai with full coverage:
  - Deployment checks (name, symbol, zero initial supply)
  - Owner minting succeeds
  - Non-owner minting reverts with OwnableUnauthorizedAccount
  - mintForDeed emits DeedRewarded with correct (recipient, amount, deed)
  - Multiple mints: totalSupply accumulates correctly
  - Transfer: after minting, recipient can transfer tokens
  - Ownership transfer: transferOwnership works, new owner mints, old owner reverts
  - Mint to multiple addresses: each balance correct, totalSupply is sum

Run tests with: npx hardhat test
```

---

### Phase 3 — Deployment Scripts

**Goal:** Deploy and verify on testnet, then mainnet.

**Tasks:**
- [ ] Write `scripts/deploy.js`
- [ ] Write `scripts/verify.js`
- [ ] Deploy to Base Sepolia
- [ ] Verify on BaseScan Sepolia
- [ ] Test a manual mint via Hardhat console on testnet

**Agentic Prompt:**
```
Create scripts/deploy.js for Hardhat:
  - Gets deployer signer from Hardhat
  - Deploys SaThuCoin contract
  - Logs: deployer address, contract address, network name, chain ID
  - Saves deployment info to data/deployment.json:
    { network, chainId, contractAddress, deployer, timestamp, txHash }
  - Creates data/ directory if it doesn't exist

Create scripts/verify.js:
  - Reads contract address from data/deployment.json
  - Runs hardhat verify (no constructor args needed)
  - Handles "already verified" gracefully

Add to package.json scripts:
  "deploy:testnet": "npx hardhat run scripts/deploy.js --network baseSepolia"
  "deploy:mainnet": "npx hardhat run scripts/deploy.js --network baseMainnet"
  "verify:testnet": "npx hardhat verify --network baseSepolia"
  "verify:mainnet": "npx hardhat verify --network baseMainnet"
```

---

### Phase 4 — Source Site Configuration

**Goal:** A flexible config system for defining source websites to scrape.

**Tasks:**
- [ ] Define `config/sources.json` schema
- [ ] Define `config/rewards.json` with defaults
- [ ] Write config loader utility that validates schema on load
- [ ] Write `cli/add-source.js` — interactive CLI to add a new source
- [ ] Add 1–2 example sources (can be dummy URLs for testing)

**Config Format — `config/sources.json`:**

```json
[
  {
    "id": "charity-alpha",
    "name": "Charity Alpha Foundation",
    "url": "https://charityalpha.org/donors",
    "type": "html",
    "selector": ".donor-wallet",
    "attribute": "text",
    "rewardAmount": "50",
    "enabled": true,
    "notes": "Publishes monthly donor list with wallet addresses"
  },
  {
    "id": "ngo-beta",
    "name": "NGO Beta",
    "url": "https://api.ngobeta.org/v1/public-donors",
    "type": "api",
    "walletField": "data.donors[].walletAddress",
    "rewardAmount": "100",
    "enabled": true,
    "notes": "JSON API returning donor wallets"
  }
]
```

**Config Format — `config/rewards.json`:**

```json
{
  "defaultReward": "10",
  "decimals": 18,
  "dryRun": false,
  "maxMintsPerCycle": 50,
  "cooldownMinutes": 5
}
```

**Agentic Prompt:**
```
Create the configuration system for SaThuCoin scraper.

config/sources.json:
  - Array of source objects
  - Each source has: id (unique string), name, url, type ("html" or "api"),
    enabled (boolean), rewardAmount (string, in whole tokens),
    notes (optional description)
  - For type "html": add fields selector (CSS selector) and
    attribute ("text" or an HTML attribute name like "data-wallet")
  - For type "api": add fields walletField (dot-notation path to wallet array
    in JSON response), optional headers object
  - Include 2 example sources with dummy URLs and realistic config

config/rewards.json:
  - defaultReward: "10" (fallback if source doesn't specify)
  - decimals: 18
  - dryRun: false (when true, log but don't actually mint)
  - maxMintsPerCycle: 50 (safety limit per scrape run)
  - cooldownMinutes: 5 (minimum time between mints to same wallet)

Create scraper/config-loader.js:
  - Exports loadSources() — reads and validates sources.json
  - Exports loadRewards() — reads and validates rewards.json
  - Validates: required fields present, URLs valid, rewardAmount is numeric,
    type is "html" or "api", no duplicate IDs
  - Throws descriptive errors on invalid config

Create cli/add-source.js:
  - Interactive prompts (use readline, no heavy deps):
    - Source name, URL, type (html/api), selector or walletField,
      reward amount, notes
  - Auto-generates ID from name (slugified)
  - Appends to sources.json
  - Prints confirmation
```

---

### Phase 5 — Scraper Engine

**Goal:** A working scraper that fetches source sites, extracts wallet addresses, and identifies new ones.

**Tasks:**
- [ ] Write `scraper/adapters/base.js` — base adapter interface
- [ ] Write `scraper/adapters/html.js` — Cheerio HTML scraper
- [ ] Write `scraper/adapters/api.js` — JSON API adapter
- [ ] Write `scraper/utils/wallet-validator.js` — validate ETH addresses
- [ ] Write `scraper/state/manager.js` — track seen wallet+source pairs
- [ ] Write `scraper/engine.js` — orchestrate full scrape cycle
- [ ] Write `test/scraper.test.js` — unit tests with mocked HTTP responses
- [ ] All scraper tests pass

**Adapter Interface:**
```
adapter.fetch(sourceConfig) → string[]  // returns array of wallet addresses
```

**State File — `scraper/state/seen-wallets.json`:**
```json
{
  "charity-alpha:0x1234abcd": {
    "source": "charity-alpha",
    "wallet": "0x1234...abcd",
    "firstSeen": "2026-02-08T12:00:00Z",
    "rewarded": true,
    "txHash": "0xabcd...1234",
    "rewardAmount": "50"
  }
}
```

Key format: `sourceId:walletAddress` — the same wallet can earn SATHU from multiple different sources, but only once per source.

**Agentic Prompt:**
```
Build the SaThuCoin scraper engine. This system fetches public charity
websites, extracts donor wallet addresses, and identifies new ones.

scraper/adapters/base.js:
  - Exports a base class or interface with method: fetch(sourceConfig) → string[]
  - Each adapter takes a source config object and returns wallet addresses

scraper/adapters/html.js:
  - Uses axios to GET the source URL
  - Uses Cheerio to parse HTML
  - Extracts wallet addresses using sourceConfig.selector
  - If sourceConfig.attribute is "text", get element text content
  - Otherwise get the specified HTML attribute value
  - Returns array of extracted strings
  - Filters to only valid Ethereum addresses (0x + 40 hex chars)

scraper/adapters/api.js:
  - Uses axios to GET the source URL (with optional headers from config)
  - Navigates JSON response using sourceConfig.walletField (dot notation path)
  - Supports array paths like "data.donors[].walletAddress"
  - Returns array of wallet addresses
  - Filters to only valid Ethereum addresses

scraper/utils/wallet-validator.js:
  - Exports isValidAddress(address) → boolean
  - Checks: starts with 0x, 42 chars total, valid hex
  - Exports normalizeAddress(address) → string (checksum using ethers.getAddress)

scraper/state/manager.js:
  - Manages scraper/state/seen-wallets.json
  - Exports:
    - loadState() → object (creates empty file if missing)
    - isNew(sourceId, wallet) → boolean
    - markRewarded(sourceId, wallet, txHash, rewardAmount) → void
    - saveState() → void
  - Key format: "sourceId:normalizedWallet"
  - Thread-safe: read at start of cycle, write at end

scraper/engine.js:
  - Exports runCycle(options):
    1. Load sources config (only enabled sources)
    2. Load state
    3. For each source:
       a. Select adapter based on source.type
       b. Call adapter.fetch(source)
       c. Validate and normalize all returned wallets
       d. Filter to new wallets (not in state)
       e. Collect { source, wallet, rewardAmount } objects
    4. Return array of new findings
  - options.dryRun: if true, don't modify state, just return findings
  - Logs: source name, wallets found, new wallets count
  - Handles fetch errors gracefully per source (skip failed, continue others)

Create test/scraper.test.js:
  - Mock HTTP responses for both HTML and API adapters
  - Test HTML adapter extracts wallets from realistic HTML
  - Test API adapter navigates nested JSON correctly
  - Test wallet validator accepts valid, rejects invalid addresses
  - Test state manager: isNew returns true for unseen, false for seen
  - Test engine: full cycle with mocked adapters, returns correct new wallets
  - Test dedup: same wallet+source not returned twice
  - Test cross-source: same wallet from different sources IS returned

Use nock or manual axios mocking for HTTP mocks.
```

---

### Phase 6 — Minter Engine

**Goal:** Connect scraper output to the smart contract. Mint SATHU for new donors.

**Tasks:**
- [ ] Write `scraper/minter.js` — calls mintForDeed on contract
- [ ] Write `scraper/utils/retry.js` — retry logic for failed transactions
- [ ] Write `scraper/utils/logger.js` — structured logging to files
- [ ] Write `scraper/index.js` — main entry combining engine + minter
- [ ] Integration test: scrape → mint on Base Sepolia testnet

**Agentic Prompt:**
```
Build the SaThuCoin minter engine that connects the scraper to the contract.

scraper/minter.js:
  - Exports mintForNewDonors(findings):
    - findings is array of { source, wallet, rewardAmount } from engine.js
    - Loads PRIVATE_KEY, CONTRACT_ADDRESS, RPC_URL from .env
    - Creates ethers provider and wallet signer
    - Loads contract ABI from Hardhat artifacts
    - For each finding:
      a. Check rewards.json maxMintsPerCycle limit
      b. Call contract.mintForDeed(wallet, parseUnits(rewardAmount, 18), source.name)
      c. Wait for tx confirmation (1 block)
      d. Call state manager markRewarded()
      e. Call logger to log the mint
      f. If tx fails, log error and continue to next (don't stop batch)
    - Returns { successful: count, failed: count, txHashes: [] }

scraper/utils/retry.js:
  - Exports withRetry(fn, maxRetries=3, delayMs=2000):
    - Calls fn(), if it throws, wait delayMs and retry
    - Exponential backoff: delay doubles each retry
    - After maxRetries, throw the last error
    - Logs each retry attempt

scraper/utils/logger.js:
  - Exports logMint(entry) — appends to data/mint-log.json
    entry: { timestamp, source, wallet, amount, txHash, network }
  - Exports logScrape(entry) — appends to data/scrape-log.json
    entry: { timestamp, sourcesChecked, walletsFound, newWallets, mintResults }
  - Creates files if they don't exist
  - All timestamps in ISO 8601

scraper/index.js (main entry point):
  - Loads config
  - Calls engine.runCycle() to get new findings
  - If dryRun mode (from rewards.json or --dry-run flag): just log findings and exit
  - Otherwise calls minter.mintForNewDonors(findings)
  - Logs full cycle summary
  - Exports run() for use by scheduler and CLI

Usage:
  node scraper/index.js              # run one cycle
  node scraper/index.js --dry-run    # scrape only, don't mint
```

---

### Phase 7 — Scheduler & CLI Tools

**Goal:** Auto-polling on a schedule + manual CLI tools for all operations.

**Tasks:**
- [ ] Write `scraper/scheduler.js` — cron-based auto polling
- [ ] Write `cli/scrape.js` — manual one-shot scrape+mint
- [ ] Write `cli/mint.js` — manual mint to any wallet
- [ ] Write `cli/balance.js` — check SATHU balance
- [ ] Write `cli/supply.js` — check total supply
- [ ] Test all CLI tools on Base Sepolia

**Agentic Prompt:**
```
Create the scheduler and CLI tools for SaThuCoin.

scraper/scheduler.js:
  - Uses node-cron to schedule scraper/index.js run()
  - Default schedule: every 6 hours ("0 */6 * * *")
  - Schedule configurable via SCRAPE_INTERVAL env var (cron string)
  - Logs each scheduled run start and completion
  - Graceful shutdown on SIGINT/SIGTERM
  - Entry point: node scraper/scheduler.js

cli/scrape.js:
  - Manual trigger for one scrape+mint cycle
  - Supports --dry-run flag
  - Calls scraper/index.js run() directly
  - Usage: node cli/scrape.js [--dry-run]

cli/mint.js:
  - Manual mint bypassing scraper (for special rewards)
  - Args: --to (address), --amount (number), --deed (string)
  - Validates all inputs
  - Calls mintForDeed on contract
  - Logs to data/mint-log.json
  - Usage: node cli/mint.js --to 0x123... --amount 50 --deed "Special recognition"

cli/balance.js:
  - Reads balanceOf from contract for given address
  - Displays formatted balance
  - Usage: node cli/balance.js --address 0x123...

cli/supply.js:
  - Reads totalSupply from contract
  - Displays formatted total supply
  - Usage: node cli/supply.js

Add to package.json scripts:
  "scrape": "node cli/scrape.js"
  "scrape:dry": "node cli/scrape.js --dry-run"
  "mint": "node cli/mint.js"
  "balance": "node cli/balance.js"
  "supply": "node cli/supply.js"
  "scheduler": "node scraper/scheduler.js"
  "start": "node scraper/scheduler.js"

Parse CLI args with process.argv (no heavy deps, use minimist only if needed).
```

---

### Phase 8 — Mainnet Deployment

**Goal:** Live on Base Mainnet, scraper running.

**Prerequisites:**
- [ ] All contract tests pass
- [ ] Scraper tests pass
- [ ] Full cycle works on Base Sepolia (scrape → find → mint → verify)
- [ ] Wallet funded with ETH on Base (~$5 worth)
- [ ] At least one real source site configured

**Tasks:**
- [ ] Deploy contract to Base Mainnet
- [ ] Verify on BaseScan
- [ ] Update .env with mainnet contract address and RPC
- [ ] Run first real scrape cycle on mainnet
- [ ] Verify first mint on BaseScan
- [ ] Update README with mainnet contract address

**Agentic Prompt:**
```
Guide me through mainnet deployment:
  1. Ensure .env has mainnet PRIVATE_KEY and RPC_URL (https://mainnet.base.org)
  2. Run: npm run deploy:mainnet
  3. Run verification on BaseScan
  4. Update .env CONTRACT_ADDRESS with new mainnet address
  5. Run: npm run scrape:dry (verify scraper finds wallets)
  6. Run: npm run scrape (first real mainnet minting cycle)
  7. Check BaseScan for the minted transaction
  8. Update README.md with:
     - Mainnet contract address
     - BaseScan link
     - Token details
```

---

### Phase 9 — Documentation & Public Launch

**Goal:** Clean, welcoming public repository ready for GitHub.

**Tasks:**
- [ ] Write `README.md` — project intro, how it works, quick start, contract address
- [ ] Write `docs/SETUP.md` — environment setup from scratch
- [ ] Write `docs/DEPLOYMENT.md` — deploy walkthrough
- [ ] Write `docs/CLI_USAGE.md` — all commands with examples
- [ ] Write `docs/ADDING_SOURCES.md` — how to add new source sites
- [ ] Write `docs/ARCHITECTURE.md` — technical deep dive
- [ ] Write `CONTRIBUTING.md` — fork, branch, PR process
- [ ] Add `LICENSE` (MIT)
- [ ] Audit all files for leaked secrets
- [ ] Push to GitHub as public repo

**Agentic Prompt:**
```
Create all documentation files for the SaThuCoin public repo.

README.md:
  - Project name, one-line description
  - "How It Works" section with simple diagram
  - Quick start: clone, install, configure, deploy, run scraper
  - Contract details: chain (Base), address, BaseScan link
  - Source sites: how the scraper works, how to add sources
  - CLI commands table
  - Tech stack
  - Contributing link
  - License (MIT)
  - Disclaimer: fictional token, no monetary value

docs/SETUP.md:
  - Prerequisites: Node.js 18+, MetaMask, ETH on Base
  - Step-by-step: clone, npm install, configure .env, compile, test

docs/DEPLOYMENT.md:
  - Testnet deployment walkthrough
  - Mainnet deployment walkthrough
  - Verification steps

docs/CLI_USAGE.md:
  - Every CLI command with usage, flags, and example output

docs/ADDING_SOURCES.md:
  - What makes a valid source site
  - How to write an HTML source config (with CSS selector tips)
  - How to write an API source config
  - Testing a new source with --dry-run
  - Submitting a source via PR

docs/ARCHITECTURE.md:
  - System diagram
  - Component descriptions
  - Data flow explanation
  - State management
  - Error handling approach

CONTRIBUTING.md:
  - Fork and clone
  - Branch naming: feature/xxx, fix/xxx
  - Run tests before PR
  - PR template
  - Code style (Prettier, ESLint basics)

LICENSE: MIT full text
```

---

## Smart Contract Specification

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SaThuCoin is ERC20, Ownable {

    event DeedRewarded(
        address indexed recipient,
        uint256 amount,
        string deed
    );

    constructor() ERC20("SaThuCoin", "SATHU") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function mintForDeed(
        address to,
        uint256 amount,
        string calldata deed
    ) external onlyOwner {
        _mint(to, amount);
        emit DeedRewarded(to, amount, deed);
    }
}
```

---

## Scraper Specification

### Adapter: HTML

**Input:** Source config with `url`, `selector`, `attribute`

**Process:**
1. HTTP GET the URL
2. Parse HTML with Cheerio
3. Select elements with CSS selector
4. Extract text or attribute value from each element
5. Filter to valid Ethereum addresses (0x + 40 hex)
6. Normalize with ethers.getAddress (checksum)

**Error handling:** If fetch fails or no elements found, log warning and return empty array. Never crash the full cycle.

### Adapter: API

**Input:** Source config with `url`, `walletField`, optional `headers`

**Process:**
1. HTTP GET the URL (with headers if provided)
2. Parse JSON response
3. Navigate to wallet array using dot-notation path
4. Extract wallet strings
5. Filter and normalize

**Dot-notation support:** `data.donors[].walletAddress` means access `data.donors` array, then get `walletAddress` from each element.

### Adding a New Adapter

Future adapters (RSS, GraphQL, CSV) can be added by:
1. Creating a new file in `scraper/adapters/`
2. Implementing `fetch(sourceConfig) → string[]`
3. Registering the adapter type in `engine.js`

---

## Source Site Configuration

### What Makes a Valid Source

A source website must:
- **Publicly list** donor/contributor wallet addresses on a web page or API
- Be **voluntarily** publishing this data (not leaked or private data)
- Be a **legitimate** organization or cause
- Be **accessible** without authentication

### Source Config Fields

| Field          | Type   | Required | Description                                    |
|---------------|--------|----------|------------------------------------------------|
| `id`          | string | yes      | Unique slug identifier                         |
| `name`        | string | yes      | Human-readable source name                     |
| `url`         | string | yes      | Page URL or API endpoint                       |
| `type`        | string | yes      | "html" or "api"                                |
| `selector`    | string | html     | CSS selector for wallet elements               |
| `attribute`   | string | html     | "text" or HTML attribute name                  |
| `walletField` | string | api      | Dot-notation path to wallets in JSON response  |
| `headers`     | object | no       | Optional HTTP headers for API requests         |
| `rewardAmount`| string | no       | SATHU per donor (defaults to rewards.json default) |
| `enabled`     | bool   | yes      | Whether to include in scrape cycles            |
| `notes`       | string | no       | Description or notes about the source          |

---

## Deduplication & State Management

### Rules

1. A wallet is rewarded **once per source**. Key: `sourceId:walletAddress`.
2. The same wallet CAN earn from **multiple different sources**. Donate to 3 charities, get 3 SATHU rewards.
3. State is persisted in `scraper/state/seen-wallets.json` (gitignored).
4. State is loaded at the start of each cycle and saved after all mints complete.
5. If minting fails for a wallet, it is NOT marked as rewarded (will retry next cycle).
6. Wallet addresses are normalized (checksummed) before comparison.

### Recovery

If state file is lost or corrupted:
- The scraper will re-discover all wallets and attempt to mint again.
- The contract doesn't prevent double-minting (it's uncapped), so duplicates are possible.
- Mitigation: keep backups of seen-wallets.json.
- Future enhancement: check on-chain DeedRewarded events for past mints before minting.

---

## Security Considerations

### What We're Doing

- Audited OpenZeppelin contracts
- Owner key in `.env`, never committed
- Contract verified on BaseScan
- Input validation on all wallet addresses
- Graceful error handling (no crash loops)
- Rate limiting via maxMintsPerCycle and cooldownMinutes

### Assumed Compromises

**Source website compromise** is explicitly in scope. If a source site is hacked and publishes fake wallet addresses:
- The scraper will mint SATHU to those fake addresses
- Since SATHU is fictional with no monetary value, the impact is cosmetic
- Mitigation: review scrape logs periodically, disable compromised sources
- Future: add anomaly detection (sudden spike in new wallets = flag)

### Risks

- **Owner key leak:** Unlimited minting. Use a dedicated wallet.
- **Lost owner key:** No more minting ever. Back it up.
- **Source site down:** Scraper skips it, tries next cycle. No harm.
- **Source site format change:** Adapter returns empty array. No harm, just missed donors until config is updated.

---

## Future Roadmap

Not commitments. Ideas for after MVP.

- **v1.1** — Anomaly detection: flag sources with unusual wallet spikes
- **v1.2** — On-chain dedup: check DeedRewarded events before minting
- **v1.3** — Dashboard: simple web UI showing total supply, recent mints, source stats
- **v2.0** — New adapters: RSS feeds, GraphQL endpoints, CSV files
- **v2.1** — Multisig ownership via Gnosis Safe
- **v2.2** — Telegram/Discord notifications on each mint
- **v3.0** — Community source curation: PRs to add sources, community review
- **v3.1** — NFT deed certificates alongside SATHU rewards

---

## Agentic Development Guide

This project is designed to be built with AI coding assistants. Each phase includes a ready-to-use **Agentic Prompt** you can paste directly into your AI tool.

### How to Use

1. Work through phases sequentially (1 → 9)
2. Copy the agentic prompt for your current phase
3. Paste into Claude, Cursor, Copilot, or your preferred AI tool
4. Review generated code before accepting
5. Run tests and verify before moving on
6. Commit after each phase

### Tips

- **One phase at a time.** Don't ask the AI to build everything at once.
- **Provide context.** Include error messages, previous file contents, or config when needed.
- **Review everything.** AI code can have subtle bugs. Read it.
- **Test before moving on.** Each phase has clear success criteria.
- **Iterate on errors.** Paste errors back to the AI. Usually a quick fix.

### Suggested Commit Flow

```
git commit -m "phase-1: project setup and hardhat config"
git commit -m "phase-2: sathucoin contract and tests"
git commit -m "phase-3: deployment and verification scripts"
git commit -m "phase-4: source site configuration system"
git commit -m "phase-5: scraper engine and adapters"
git commit -m "phase-6: minter engine"
git commit -m "phase-7: scheduler and cli tools"
git commit -m "phase-8: mainnet deployment"
git commit -m "phase-9: documentation and public launch"
```

---

## License

MIT — Do whatever you want with this. Fork it. Improve it. Build your own version. Make the world a little better.

---

## Disclaimer

SaThuCoin is a **fictional, fun project**. It has **no monetary value**, is **not an investment**, and should **not be treated as a financial instrument**. SATHU tokens exist purely as a symbolic recognition of generosity. Do not buy, sell, or trade SATHU expecting financial returns. This project is for educational and entertainment purposes only.

The scraper only reads **publicly available data** that organizations have chosen to share. It does not access private data, bypass authentication, or scrape data against the wishes of site owners. If a source site does not want to be included, it can be removed immediately by opening an issue or PR.
