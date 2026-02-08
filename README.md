# SaThuCoin (SATHU)

A fictional ERC-20 token on Base chain that rewards charitable donors. Every SATHU in existence represents a verified donation someone made to a public cause.

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

## Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

## License

MIT
