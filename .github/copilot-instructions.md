# Copilot Coding Agent Instructions — SaThuCoin

> Trust these instructions first. Only search the codebase if the information here is incomplete or found to be in error.

## Project Summary

SaThuCoin (SATHU) is a fictional ERC-20 token on Base chain (Ethereum L2) that rewards charitable donors. Supply starts at zero; every token is minted by the contract owner in response to a verified donation. The project is a Hardhat 2 monorepo using Solidity 0.8.26, ethers.js v6, and OpenZeppelin Contracts v5.4.

## Tech Stack & Versions

| Component | Version | Notes |
|---|---|---|
| Node.js | 18+ required | |
| Hardhat | 2.x (`^2.28.4`) | Do NOT use Hardhat 3 |
| Solidity | 0.8.26 | Configured in `hardhat.config.js` |
| OpenZeppelin Contracts | 5.4.x (`^5.4.0`) | NOT v4 — constructor patterns differ |
| ethers.js | 6.x | Bundled via `@nomicfoundation/hardhat-toolbox` — do NOT install separately |
| @nomicfoundation/hardhat-toolbox | ^5.0.0 | Bundles ethers v6, chai, mocha, hardhat-verify, hardhat-network-helpers |
| dotenv | ^17.2.4 | Loads `.env` secrets |
| cheerio / axios / node-cron | Phase 2 scraper deps (installed) | |
| Module system | CommonJS (`"type": "commonjs"` in package.json) | Use `require()`, not `import` |

## Build & Test Commands

Always run `npm install` before any other command if `node_modules/` does not exist.

```bash
# 1. Install dependencies (always run first)
npm install

# 2. Compile Solidity contracts
npm run compile          # runs: npx hardhat compile

# 3. Run all tests
npm test                 # runs: npx hardhat test

# 4. Run tests with gas reporting
npm run test:gas         # runs: REPORT_GAS=true npx hardhat test

# 5. Clean build artifacts
npm run clean            # runs: npx hardhat clean

# 6. Deploy to testnet (requires .env with PRIVATE_KEY)
npm run deploy:testnet   # runs: npx hardhat run scripts/deploy.js --network base-sepolia

# 7. Deploy to mainnet (requires .env with PRIVATE_KEY)
npm run deploy:mainnet   # runs: npx hardhat run scripts/deploy.js --network base-mainnet
```

**Required sequence:** `npm install` → `npm run compile` → `npm test`. Always compile before testing. If you modify a `.sol` file, always recompile before running tests.

**Environment file:** Copy `.env.example` to `.env` before running deploy commands. The `.env` file is gitignored and never committed. Compile and test work without `.env`.

## Repository Layout

```
.                          # Root — ~40 source files (excluding node_modules)
├── contracts/
│   └── SaThuCoin.sol      # The single Solidity smart contract (ERC20 + Ownable)
├── test/
│   └── SaThuCoin.test.js  # Comprehensive test suite (384 lines, ~25 tests)
├── scripts/
│   ├── deploy.js          # Deployment script (saves to data/deployment.json)
│   └── verify.js          # BaseScan contract verification script
├── config/
│   ├── rewards.json       # Reward settings (defaultReward, maxMintsPerCycle, etc.)
│   └── sources.json       # Source site definitions for scraper (Phase 2)
├── hardhat.config.js      # Hardhat config — Solidity version, networks, etherscan
├── package.json           # npm scripts, dependencies
├── .env.example           # Template for environment variables
├── .gitignore             # Ignores node_modules, artifacts, cache, .env, data/*.json
├── README.md              # Quick start guide
├── PROJECT_PLAN.md        # Detailed project plan and architecture
├── 202602081631_AGENT_PHASE1_INSTRUCTION.md   # Phase 1 bootstrap instructions (historical)
└── SATHUCOIN_AI_CODING_GUIDE.md  # Detailed coding patterns reference
```

**Directories not yet created** (planned for Phase 2): `scraper/`, `cli/`, `data/`, `docs/`.

## Smart Contract Architecture

`contracts/SaThuCoin.sol` inherits from OpenZeppelin `ERC20` and `Ownable`:
- **Constructor:** `ERC20("SaThuCoin", "SATHU") Ownable(msg.sender)` — zero initial supply.
- **`mint(address to, uint256 amount)`** — Owner-only standard mint.
- **`mintForDeed(address to, uint256 amount, string deed)`** — Owner-only mint that emits a `DeedRewarded` event.
- No burn, no cap, no pause functionality.

## Critical Coding Patterns (Common AI Mistakes)

These are the patterns this project uses. Using older patterns **will break the build**:

| Correct (OZ v5 / ethers v6) | Wrong (will break) |
|---|---|
| `Ownable(msg.sender)` | `Ownable()` |
| `import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol"` | `import "@openzeppelin/contracts/token/ERC20/ERC20.sol"` |
| `ethers.parseEther("100")` | `ethers.utils.parseEther("100")` |
| `await contract.waitForDeployment()` | `await contract.deployed()` |
| `await contract.getAddress()` | `contract.address` (may work but prefer `getAddress()`) |
| Native `BigInt` / `100n` | `ethers.BigNumber.from(100)` |
| `.to.be.revertedWithCustomError(contract, "ErrorName")` | `.to.be.revertedWith("string")` |
| `const [owner] = await ethers.getSigners()` | `const [owner] = await hre.ethers.getSigners()` (both work in tests) |

## Test Structure

Tests use Mocha (via Hardhat) + Chai + `@nomicfoundation/hardhat-toolbox/network-helpers`:
- **`loadFixture(deployFixture)`** — Deploys a fresh contract per test using Hardhat snapshots.
- Test sections: Deployment, Minting (mint), Minting (mintForDeed), Transfers, Approvals, Ownership, Supply tracking.
- All assertions use Chai `expect()`. Token amounts use `ethers.parseEther()`.

When adding tests, follow the existing pattern: add to a `describe` block inside `test/SaThuCoin.test.js`, use `loadFixture(deployFixture)`, and use `ethers.parseEther()` for amounts.

## CI / Validation

There are no custom CI/CD workflows — the only GitHub Actions workflow is the Copilot coding agent itself. Validation is done locally:

1. `npm run compile` — must complete with no errors.
2. `npm test` — all tests must pass.
3. No linter is configured (no ESLint, Solhint, or Prettier config files).

## Configuration Files

- **`hardhat.config.js`** — Solidity 0.8.26 with optimizer (200 runs). Networks: `base-sepolia` (chainId 84532) and `base-mainnet` (chainId 8453). Uses `dotenv` for env vars.
- **`config/rewards.json`** — `defaultReward: "10"`, `decimals: 18`, `maxMintsPerCycle: 50`, `cooldownMinutes: 5`.
- **`config/sources.json`** — Array of scraper source definitions (all disabled examples).

## Key Gotchas

1. **Do NOT install `ethers` separately** — it is bundled with `@nomicfoundation/hardhat-toolbox`. Installing it separately causes version conflicts.
2. **Module system is CommonJS** — use `require()` and `module.exports`, not `import`/`export`.
3. **Solidity version is pinned to 0.8.26** — do not change unless explicitly asked.
4. **The `.env` file is required for deployment but NOT for compile/test.**
5. **`data/` directory is created at runtime** by `scripts/deploy.js` and is gitignored.
6. **Optimizer is enabled** (200 runs) in `hardhat.config.js`.
