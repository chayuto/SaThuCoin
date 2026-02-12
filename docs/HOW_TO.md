# SaThuCoin — How To Guide

> Practical commands for building, testing, and operating SaThuCoin.

---

## Build & Test

```bash
# Install dependencies
npm install

# Compile Solidity contracts
npm run compile

# Run all tests (compile first)
npm test

# Run tests with gas reporting
npm run test:gas

# Check contract sizes
npm run size

# Clean build artifacts
npm run clean
```

**Required sequence:** `npm install` → `npm run compile` → `npm test`

---

## Validate an Address

Check if a donor address is valid and well-formed:

```bash
node -e "
const { ethers } = require('ethers');
const addr = '0xEeB5c90edaA4a029752273644D40801E83329268';
try {
  const checksummed = ethers.getAddress(addr);
  console.log('Valid:      ', true);
  console.log('Checksummed:', checksummed);
  console.log('Is zero:    ', checksummed === ethers.ZeroAddress);
} catch (e) {
  console.log('Valid: false —', e.message);
}
"
```

Check address activity on Base:

```bash
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const addr = '0xEeB5c90edaA4a029752273644D40801E83329268';
(async () => {
  const [balance, txCount, code] = await Promise.all([
    provider.getBalance(addr),
    provider.getTransactionCount(addr),
    provider.getCode(addr),
  ]);
  console.log('ETH balance:', ethers.formatEther(balance), 'ETH');
  console.log('Tx count:   ', txCount);
  console.log('Is EOA:     ', code === '0x' ? 'yes (wallet)' : 'no (contract)');
})();
"
```

> **Note:** An address does not need prior activity on Base to receive SATHU. EVM addresses work on all EVM chains.

---

## Minting Tokens

Use the `npx hardhat mint` task. It reads from `data/deployment.json`, validates MINTER_ROLE, checks if the contract is paused, and enforces the per-tx limit.

```bash
# Mint 10 SATHU
npx hardhat mint --to 0xEeB5c90edaA4a029752273644D40801E83329268 --amount 10 --network base-mainnet

# Mint with a deed description (uses mintForDeed)
npx hardhat mint --to 0xEeB5c90edaA4a029752273644D40801E83329268 --amount 10 --deed "Donated to Red Cross" --network base-mainnet

# Mint 1 boon (smallest unit = 10⁻¹⁸ SATHU)
npx hardhat mint --to 0xEeB5c90edaA4a029752273644D40801E83329268 --amount 1boon --deed "First boon ever minted" --network base-mainnet

# Mint 500 boon
npx hardhat mint --to 0xEeB5c90edaA4a029752273644D40801E83329268 --amount 500boon --deed "Merit offering" --network base-mainnet

# Read deed from a text file (good for long multi-line text)
npx hardhat mint --to 0xEeB5c90edaA4a029752273644D40801E83329268 --amount 1boon --deed-file deed.txt --network base-mainnet

# Dry run (estimate gas, no transaction sent)
npx hardhat mint --to 0xEeB5c90edaA4a029752273644D40801E83329268 --amount 10 --deed "Test" --dry-run --network base-sepolia
```

| Flag | Required | Description |
|------|----------|-------------|
| `--to` | yes | Recipient address (EIP-55 checksummed) |
| `--amount` | yes | Amount in SATHU or boon (see format table below) |
| `--deed` | no | Deed description (triggers `mintForDeed` instead of `mint`) |
| `--deed-file` | no | Path to a text file containing the deed (alternative to `--deed`) |
| `--dry-run` | no | Simulate without sending a transaction |
| `--network` | yes | Target network (`base-sepolia` or `base-mainnet`) |

**Amount formats:**

| Input | Meaning |
|-------|---------|
| `10` | 10 SATHU |
| `0.5` | 0.5 SATHU |
| `1boon` | 1 boon (10⁻¹⁸ SATHU) |
| `500boon` | 500 boon |

---

## Deed Files

For long or multi-line deeds, create a text file and use `--deed-file`:

```bash
# Create a deed file
cat > deed.txt << 'EOF'
Namo Tassa Phakhawato Arahato Samma Sambuddhassa
Namo Tassa Phakhawato Arahato Samma Sambuddhassa
Namo Tassa Phakhawato Arahato Samma Sambuddhassa
Om Namo Buddhaya Ya-A-Sa Su-Mang Ja-Pa-Ka
Kho hai ban Melanee ploy chao dai wai wai ra-ka $550 dollar tor sap-da. Sadhu!
EOF

# Use it
npx hardhat mint --to 0xEeB5c90edaA4a029752273644D40801E83329268 --amount 1boon --deed-file deed.txt --network base-mainnet
```

> **Tip:** Deed text is stored permanently on-chain in the `DeedRewarded` event. Keep it meaningful.

---

## Denominations

| Unit | Value |
|------|-------|
| 1 boon | 10⁻¹⁸ SATHU (smallest unit) |
| 1 SATHU | 10¹⁸ boon |

`boon` is to SATHU what `wei` is to ETH. The name comes from Thai บุญ, meaning *merit* or *good deed*.

---

## Deployment & Verification

These commands are **human-only** — never run by automated agents.

```bash
# Deploy to Base Sepolia testnet
npm run deploy:testnet

# Deploy to Base Mainnet
npm run deploy:mainnet

# Verify on BaseScan (testnet)
npm run verify:testnet

# Verify on BaseScan (mainnet)
npm run verify:mainnet
```

Deployment saves contract info to `data/deployment.json`.

---

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your values:
   - `PRIVATE_KEY` — deployer/minter wallet private key
   - `CONTRACT_ADDRESS` — deployed contract address
   - `RPC_URL` — Base RPC endpoint
   - `BASESCAN_API_KEY` — for contract verification

```bash
cp .env.example .env
```

---

## Adding Source Sites

Use the interactive CLI to add a new scraper source:

```bash
node cli/add-source.js
```

This prompts for source name, URL, type (html/api), selectors, and reward amount, then appends to `config/sources.json`.

---

## Useful Links

- **Contract (Mainnet):** [BaseScan](https://basescan.org/address/0x974FCaC6add872B946917eD932581CA9f7188AbD#code)
- **Token page:** [BaseScan Token](https://basescan.org/token/0x974FCaC6add872B946917eD932581CA9f7188AbD)
- **Base network:** Chain ID 8453 — [Add to MetaMask](https://chainlist.org/chain/8453)
