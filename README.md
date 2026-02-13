# SaThuCoin (SATHU)

[![CI](https://github.com/chayuto/SaThuCoin/actions/workflows/ci.yml/badge.svg)](https://github.com/chayuto/SaThuCoin/actions)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-363636?logo=solidity)](https://soliditylang.org/)
[![Base](https://img.shields.io/badge/Base-Mainnet-0052FF?logo=coinbase)](https://basescan.org/address/0x974FCaC6add872B946917eD932581CA9f7188AbD)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-v5.4-4E5EE4?logo=openzeppelin)](https://www.openzeppelin.com/contracts)
[![Verified](https://img.shields.io/badge/BaseScan-Verified-00C853?logo=ethereum)](https://basescan.org/address/0x974FCaC6add872B946917eD932581CA9f7188AbD#code)
[![ERC-20](https://img.shields.io/badge/ERC--20-Token-3C3C3D?logo=ethereum)](https://basescan.org/token/0x974FCaC6add872B946917eD932581CA9f7188AbD)
[![Chain](https://img.shields.io/badge/Chain_ID-8453-0052FF)](https://chainlist.org/chain/8453)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![SaThuCoin Banner](assets/images/sathu_banner.png)

An ERC-20 token on Base (Ethereum L2) that rewards charitable donors. Every SATHU represents a verified donation.

**Mainnet:** [`0x974FCaC6add872B946917eD932581CA9f7188AbD`](https://basescan.org/address/0x974FCaC6add872B946917eD932581CA9f7188AbD#code)

### Name & Culture

"SaThuCoin" comes from **สาธุ** (*sa-thu*), a Thai and Buddhist expression of blessing and approval — often spoken after a prayer, a good deed, or an act of generosity. The token rewards donors inspired by the Buddhist tradition of **merit-making** (ทำบุญ, *tham boon*): the belief that acts of giving create positive karma.

The smallest unit of SATHU is called a **boon** (Thai: บุญ), meaning *merit* or *good deed*. Every fraction of SATHU represents a fraction of good.

### Denominations

| Unit | Value |
|------|-------|
| 1 boon | 10⁻¹⁸ SATHU (smallest unit) |
| 1 SATHU | 10¹⁸ boon |

Standard ERC-20 with 18 decimals — `boon` is to SATHU what `wei` is to ETH.

<p align="center">
  <img src="assets/images/sathu_coin.png" width="45%" alt="SaThuCoin Token">
  <img src="assets/images/sathu_mascot.png" width="45%" alt="SaThuCoin Mascot">
</p>

## How It Works

SaThuCoin implements a **deed/offering cycle** rooted in Buddhist practice:

**Deed → Mint (ทำบุญ → ได้บุญ):** A verified donation triggers token minting. The deed description is permanently recorded on-chain via the `DeedRewarded` event — an immutable record of generosity. This mirrors **merit-making** (ทำบุญ, *tham boon*): giving creates merit.

**Offering → Burn (ถวาย → ปล่อยวาง):** Token holders can voluntarily burn their tokens with an on-chain message — a prayer, dedication, or blessing — emitted as an `OfferingMade` event. This mirrors **making an offering** (ถวาย, *tha-wai*) and **letting go** (ปล่อยวาง, *ploi wang*): releasing merit as spiritual practice.

The cycle is implemented across two contracts:

| Contract | Role |
|----------|------|
| **SaThuCoin** | Core ERC-20 token with `mintForDeed()` — mints tokens and emits `DeedRewarded` |
| **SaThuCompanion** | Enhanced minting with source/category tags (`mintForDeedTagged()`, `DeedRecorded`) and offering burns (`burnWithOffering()`, `OfferingMade`) |

## Features

- **Zero initial supply** — tokens are minted only for verified donations
- **Deed minting** — `mintForDeed()` records each donation on-chain; `mintForDeedTagged()` adds source and category metadata
- **Offering burns** — `burnWithOffering()` lets holders burn tokens with an on-chain dedication or prayer
- **AccessControl** — separate admin (Safe multisig), minter (bot), and pauser roles
- **Supply cap** — 1 billion SATHU maximum
- **Daily mint limit** — 500,000 SATHU/day, 10,000 SATHU/tx
- **Pausable** — emergency stop for all transfers and minting
- **ERC20Permit** — gasless approvals (EIP-2612) and gasless offering burns via `burnWithOfferingPermit()`
- **Companion contract** — SaThuCompanion extends the core token with enhanced events and offering functionality

## Quick Start

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Run tests with gas reporting
npm run test:gas

# Deploy to Base Sepolia testnet
npm run deploy:testnet

# Deploy to Base mainnet
npm run deploy:mainnet
```

## Project Structure

```
contracts/       — SaThuCoin (core ERC-20) and SaThuCompanion (deed tags + offerings)
test/            — Contract tests (SaThuCoin + SaThuCompanion)
scripts/         — Deployment and verification scripts
config/          — Source site and reward configuration
scraper/         — Donor scraper engine (Phase 2)
cli/             — Command-line tools (Phase 2)
data/            — Runtime data (gitignored)
docs/            — Documentation
```

## Documentation

- [How To Guide](docs/HOW_TO.md) — build, test, mint, validate addresses
- [Donor Guide](docs/DONOR_GUIDE.md) — how to receive SATHU tokens
- [Incident Response](docs/INCIDENT_RESPONSE.md) — emergency playbooks

## Environment Setup

Copy `.env.example` to `.env` and fill in your values. See the [Pre-deployment Checklist](docs/PREDEPLOYMENT_CHECKLIST.md) for details on each variable.

```bash
cp .env.example .env
```

## Tech Stack

Solidity 0.8.26 | OpenZeppelin v5.4 | Hardhat 2 | ethers.js v6 | Base (Coinbase L2)

## License

MIT
