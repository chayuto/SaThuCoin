---
name: gas-report
description: Run gas analysis on contract functions and report costs. Use when the user asks about gas usage, optimization, or contract efficiency.
allowed-tools: Bash(npm run compile), Bash(npm run test:gas), Bash(npm run size)
---

# /gas-report — Gas Cost Analysis

Run the full gas analysis pipeline for SaThuCoin and produce a clear summary.

## Steps

1. Run `npm run compile` to ensure contracts are compiled
2. Run `npm run test:gas` (sets `REPORT_GAS=true` and runs all tests)
3. Run `npm run size` to get contract size information

## Output Requirements

Produce a structured summary with:

### Per-Function Gas Costs

For each contract function (`mint`, `mintForDeed`, `transfer`, `transferFrom`, `approve`), report:
- **Min / Avg / Max** gas usage
- **Number of calls** observed during tests

### Contract Size

- Report contract size in kB from `hardhat-contract-sizer` output
- Base chain contract size limit is 24.576 kB (same as Ethereum)
- Flag if the contract exceeds 80% of the limit (>19.66 kB)

### Cost Estimates

Using approximate Base chain gas prices:
- Base L2 execution gas: ~0.001 gwei (very cheap)
- L1 data fee: dominant cost, varies with Ethereum gas prices
- Provide rough USD estimates if possible, noting they vary with L1 gas

### Optimization Notes

Highlight any of the following if observed:
- Functions exceeding 100,000 gas
- Significant variance between min and max (indicates input-dependent cost)
- The `deed` string parameter in `mintForDeed` — note that longer strings cost more gas due to calldata
- Optimizer is set to 200 runs — note tradeoff (lower runs = cheaper deploy, higher runs = cheaper execution)

## Key Context

- Contract: `contracts/SaThuCoin.sol` (ERC20 + Ownable, 49 lines)
- Optimizer: enabled, 200 runs (configured in `hardhat.config.js`)
- `hardhat-gas-reporter` is bundled with `@nomicfoundation/hardhat-toolbox`
- `hardhat-contract-sizer` is installed as a devDependency
