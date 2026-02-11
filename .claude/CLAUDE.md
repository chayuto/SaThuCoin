# SaThuCoin — Claude Code Instructions

> Authoritative instructions for AI agents working on this project.
> For detailed coding patterns, see @.github/copilot-instructions.md

## Project

SaThuCoin (SATHU) is an ERC-20 token on Base chain (Ethereum L2) that rewards charitable donors. Supply starts at zero; every token is minted by the contract owner in response to a verified donation.

## Tech Stack

- **Solidity** ^0.8.20 (compiled with 0.8.26) — OpenZeppelin Contracts v5.4.0
- **Hardhat** 2.x with `@nomicfoundation/hardhat-toolbox` ^5.0.0
- **ethers.js** v6 (bundled — do NOT install separately)
- **Node.js** 18+ — CommonJS modules (`require()`, not `import`)
- **Chain**: Base Sepolia (84532) / Base Mainnet (8453)

## Build & Test

```bash
npm install             # install dependencies
npm run compile         # compile Solidity contracts
npm test                # run all tests (must compile first)
npm run test:gas        # run tests with gas reporting
npm run clean           # clean build artifacts
```

**Human-only commands (agent must NEVER execute):**
```bash
npm run deploy:testnet  # deploy to Base Sepolia (requires .env)
npm run deploy:mainnet  # deploy to Base Mainnet (requires .env)
```

**Required sequence:** `npm install` → `npm run compile` → `npm test`

## Critical Patterns (will break build if wrong)

| Correct (this project) | Wrong (will fail) |
|---|---|
| `Ownable(msg.sender)` | `Ownable()` |
| `ethers.parseEther("100")` | `ethers.utils.parseEther("100")` |
| `await contract.waitForDeployment()` | `await contract.deployed()` |
| `await contract.getAddress()` | `contract.address` |
| Native `BigInt` / `100n` | `ethers.BigNumber.from(100)` |
| `.revertedWithCustomError(contract, "Err")` | `.revertedWith("string")` |
| `import {ERC20} from "...ERC20.sol"` | `import "...ERC20.sol"` |

## Key Files

- `contracts/SaThuCoin.sol` — ERC-20 token contract (ERC20 + Ownable)
- `test/SaThuCoin.test.js` — Comprehensive test suite (~25 tests)
- `scripts/deploy.js` — Deployment script (saves to data/deployment.json)
- `scripts/verify.js` — BaseScan verification
- `config/rewards.json` — Reward settings (10 SATHU default)
- `config/sources.json` — Scraper source definitions (Phase 2)
- `hardhat.config.js` — Solidity 0.8.26, optimizer 200 runs, Base networks

## Project Phases

- Phase 1-3: DONE — Contract, tests, deployment scripts
- Phase 4-7: TODO — Scraper engine, minter, scheduler, CLI tools
- Phase 8-9: TODO — Mainnet deployment, documentation

For detailed phase instructions, see @docs/PROJECT_PLAN.md

## Security

Review the comprehensive security analysis before working on security-critical code:
@docs/SaThuCoin comprehensive security deep dive.md

Key security principles for this project:
- **AGENT MUST NEVER interact with mainnet or testnet programmatically** — all deploy, verify, and on-chain commands are human-executed only
- AI agents must NEVER access or handle private keys
- All AI-generated code is untrusted — human review required for security-critical paths
- npm dependencies must use exact version pinning, not `^` or `~`
- Validate all scraped wallet addresses with EIP-55 checksum (`ethers.getAddress()`)
- Implement per-cycle minting caps to limit blast radius
- Never log private keys or sensitive values — use pattern-based redaction
- Use `npm ci` (not `npm install`) in production
- Treat owner key compromise as CRITICAL — architecture must limit blast radius

## Conventions

- No linter configured — keep code consistent with existing style
- CommonJS only (`require`/`module.exports`)
- Token amounts always use `ethers.parseEther()` for 18-decimal values
- Tests use `loadFixture(deployFixture)` pattern for isolation
- `.env` required for deployment only, not for compile/test
- `data/` directory is created at runtime and gitignored
