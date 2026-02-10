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

<p align="center">
  <img src="assets/images/sathu_coin.png" width="45%" alt="SaThuCoin Token">
  <img src="assets/images/sathu_mascot.png" width="45%" alt="SaThuCoin Mascot">
</p>

## Features

- **Zero initial supply** — tokens are minted only for verified donations
- **AccessControl** — separate admin (Safe multisig), minter (bot), and pauser roles
- **Supply cap** — 1 billion SATHU maximum
- **Daily mint limit** — 500,000 SATHU/day, 10,000 SATHU/tx
- **Pausable** — emergency stop for all transfers and minting
- **ERC20Permit** — gasless approvals (EIP-2612)
- **Burnable** — token holders can burn their own tokens

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
contracts/       — Solidity smart contracts
test/            — Contract tests
scripts/         — Deployment and verification scripts
config/          — Source site and reward configuration
scraper/         — Donor scraper engine (Phase 2)
cli/             — Command-line tools (Phase 2)
data/            — Runtime data (gitignored)
docs/            — Documentation
```

## Documentation

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
