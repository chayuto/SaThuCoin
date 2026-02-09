# SaThuCoin Deployment Setup Guide

> Detailed prerequisites and environment setup for deploying SaThuCoin.
> For the step-by-step deployment process, see [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md).
> For incident response procedures, see [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Wallet Setup](#wallet-setup)
3. [RPC Provider Setup](#rpc-provider-setup)
4. [BaseScan API Key](#basescan-api-key)
5. [Environment Configuration](#environment-configuration)
6. [Build and Test Verification](#build-and-test-verification)
7. [Contract Parameters Reference](#contract-parameters-reference)
8. [Network Reference](#network-reference)
9. [Testnet Deployment Walkthrough](#testnet-deployment-walkthrough)
10. [Mainnet Deployment Walkthrough](#mainnet-deployment-walkthrough)
11. [Post-Deployment Operations](#post-deployment-operations)
12. [Deployment Artifacts](#deployment-artifacts)
13. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

SaThuCoin uses a role-based access control model with three distinct roles, each intended for a separate wallet:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SaThuCoin Contract                          │
│                                                                     │
│  Roles:                                                             │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ DEFAULT_ADMIN_ROLE│  │ MINTER_ROLE  │  │   PAUSER_ROLE        │  │
│  │ (Safe Multisig)  │  │ (Minter EOA) │  │   (Safe Multisig)    │  │
│  │                  │  │              │  │                      │  │
│  │ - Grant roles    │  │ - mint()     │  │ - pause()            │  │
│  │ - Revoke roles   │  │ - mintFor    │  │ - unpause()          │  │
│  │                  │  │   Deed()     │  │                      │  │
│  └──────────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                     │
│  Limits:                                                            │
│  - Supply cap:     1,000,000,000 SATHU                             │
│  - Per-tx limit:   10,000 SATHU                                    │
│  - Daily limit:    500,000 SATHU                                   │
│  - Initial supply: 0 SATHU                                         │
└─────────────────────────────────────────────────────────────────────┘

Deployment Participants:

  Deployer EOA ──deploy──► Contract
  (temporary)               │
                            ├── admin  = Safe Multisig (ADMIN + PAUSER)
                            └── minter = Minter EOA (MINTER)
```

**Key principle:** The deployer wallet is only used for the deployment transaction itself. After deployment, all contract management is done through the admin (Safe multisig) and minter wallets.

---

## Wallet Setup

You need three wallets. For testnet, a single wallet can serve all three roles.

### 1. Deployer Wallet

The deployer submits the contract creation transaction. It does NOT receive any role in the contract (unless it is also set as admin/minter).

**Testnet:**
- Use any wallet (MetaMask, CLI-generated, etc.)
- Only needs Base Sepolia ETH for gas (~0.005 ETH)

**Mainnet:**
- Use a dedicated, temporary EOA
- Fund with just enough ETH to cover deployment gas (~0.001-0.005 ETH at typical gas prices)
- After deployment, the deployer has no special privileges

**Generating a new deployer wallet (CLI):**

```bash
# Using OpenSSL (generates raw private key)
openssl rand -hex 32

# Using cast (Foundry) — generates key and shows address
cast wallet new
```

Store the private key securely. You will need it for the `PRIVATE_KEY` environment variable.

### 2. Admin Wallet (Safe Multisig) — Recommended for Mainnet

The admin wallet holds `DEFAULT_ADMIN_ROLE` and `PAUSER_ROLE`. It controls role management and emergency pause/unpause.

**Testnet:** A regular EOA is fine.

**Mainnet:** Use a [Safe (formerly Gnosis Safe)](https://app.safe.global/) multisig:

1. Go to [app.safe.global](https://app.safe.global/) and connect to Base network
2. Create a new Safe with at least 2 signers (2-of-3 or 3-of-5 recommended)
3. Each signer should use a hardware wallet (Ledger, Trezor)
4. Note the Safe address — this is your `ADMIN_ADDRESS`

**Why a multisig?**
- Prevents single point of failure for admin operations
- Requires multiple approvals for role changes
- The contract's `renounceRole` override prevents accidentally losing admin access, but cannot prevent a compromised single-key admin from granting roles to an attacker

### 3. Minter Wallet (Dedicated EOA)

The minter wallet holds `MINTER_ROLE` and is used by the minting CLI or future automation bot.

**Testnet:** Can be the same as the deployer.

**Mainnet:**
- Generate a new EOA dedicated to minting
- Fund with small amount of ETH for gas (~0.01 ETH for many mint transactions)
- Store the private key in a secure environment (not on a developer laptop)
- This wallet is the most frequently used and thus the highest risk for key compromise
- If compromised, the admin can revoke its role and grant a new minter

```bash
# Generate minter EOA
cast wallet new
# or
openssl rand -hex 32
```

### Wallet Summary

| Wallet | Role(s) | Testnet | Mainnet |
|--------|---------|---------|---------|
| Deployer | None (sends deploy tx) | Any EOA | Temporary EOA |
| Admin | DEFAULT_ADMIN_ROLE, PAUSER_ROLE | Any EOA | Safe multisig (2-of-3+) |
| Minter | MINTER_ROLE | Any EOA | Dedicated EOA |

---

## RPC Provider Setup

The deploy script connects to Base via an RPC endpoint.

### Testnet (Base Sepolia)

The default public RPC works for testnet:

```
https://sepolia.base.org
```

No signup required. Set via `RPC_URL` in `.env` or use the default.

### Mainnet (Base Mainnet)

**Do NOT use the public RPC for mainnet.** The deploy script warns if you do.

Sign up for a private RPC provider:

| Provider | Free Tier | Signup |
|----------|-----------|--------|
| **Alchemy** | 300M compute units/month | [alchemy.com](https://www.alchemy.com/) |
| **QuickNode** | Limited free tier | [quicknode.com](https://www.quicknode.com/) |
| **Infura** | 100K requests/day | [infura.io](https://www.infura.io/) |
| **Ankr** | Limited free tier | [ankr.com](https://www.ankr.com/) |

**Setup steps (example with Alchemy):**

1. Create account at alchemy.com
2. Create a new app, select **Base Mainnet** network
3. Copy the HTTPS endpoint URL (e.g., `https://base-mainnet.g.alchemy.com/v2/YOUR_KEY`)
4. Set as `RPC_URL_MAINNET` in your `.env`

**Why private RPC?**
- Rate limiting: Public RPCs throttle requests aggressively
- Reliability: Private RPCs have uptime SLAs
- Privacy: Public RPCs may log your transactions
- Speed: Lower latency and faster response times

---

## BaseScan API Key

Required for contract source code verification on BaseScan (the Base chain block explorer).

### Obtaining the API Key

1. Go to [basescan.org](https://basescan.org/) and create an account
2. Navigate to **API Keys** in your account dashboard (or go to [basescan.org/myapikey](https://basescan.org/myapikey))
3. Click **Add** to create a new API key
4. Copy the key — set as `BASESCAN_API_KEY` in your `.env`

**Note:** The same API key works for both Base Sepolia and Base Mainnet verification. The Hardhat config is pre-configured with the correct API endpoints for both networks.

---

## Environment Configuration

### Creating the `.env` File

Create a `.env` file in the project root. This file is gitignored and must never be committed.

```bash
# Create from scratch
touch .env
```

### `.env` Variables Reference

```bash
# ─────────────────────────────────────────────
# REQUIRED — Deployment will fail without these
# ─────────────────────────────────────────────

# Private key of the deployer wallet (without 0x prefix)
# This key signs the deployment transaction
# WARNING: Never share, commit, or log this value
PRIVATE_KEY=abc123def456...   # 64 hex characters, no 0x prefix

# BaseScan API key for contract verification
BASESCAN_API_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# ─────────────────────────────────────────────
# OPTIONAL — Defaults are provided
# ─────────────────────────────────────────────

# RPC URL for Base Sepolia testnet
# Default: https://sepolia.base.org
RPC_URL=https://sepolia.base.org

# RPC URL for Base Mainnet
# Default: https://mainnet.base.org (NOT recommended for production)
# Use a private RPC provider (Alchemy, QuickNode, etc.)
RPC_URL_MAINNET=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY

# ─────────────────────────────────────────────
# ROLE ADDRESSES — Default to deployer if not set
# ─────────────────────────────────────────────

# Address to receive DEFAULT_ADMIN_ROLE and PAUSER_ROLE
# Should be a Safe multisig address on mainnet
# Default: deployer address
ADMIN_ADDRESS=0x...

# Address to receive MINTER_ROLE
# Should be a dedicated minter EOA on mainnet
# Default: deployer address
MINTER_ADDRESS=0x...
```

### Verifying the `.env`

Quick sanity checks before deployment:

```bash
# Check the file exists and has content (don't print secrets)
wc -l .env

# Verify the private key length (should be 64 characters)
# DO NOT print the actual key
grep -c 'PRIVATE_KEY=.\{64\}' .env
```

---

## Build and Test Verification

Before any deployment, verify the project builds and all tests pass.

### Step 1: Install Dependencies

```bash
npm install
```

This installs all dependencies including Hardhat, OpenZeppelin contracts, and the Hardhat toolbox (which bundles ethers.js v6).

### Step 2: Compile Contracts

```bash
npm run compile
```

Expected output: `Compiled 1 Solidity file successfully`

### Step 3: Run Tests

```bash
npm test
```

All tests must pass. The test suite covers:
- Deployment and role setup
- Minting (basic and mintForDeed)
- Per-transaction and daily mint limits
- Pausing and unpausing
- Role-based access control
- Custom error messages
- Token burning
- ERC20Permit (gasless approvals)
- ERC165 interface support

### Step 4: Check Coverage (Mainnet Only)

```bash
npm run coverage
```

Target: 100% coverage before mainnet deployment.

### Step 5: Check Contract Size (Mainnet Only)

```bash
npm run size
```

The contract must be under 24 kB (the EVM contract size limit). Current size is approximately 7-8 kB.

### Step 6: Run Linter (Optional)

```bash
npm run lint:sol
```

### Step 7: Run Static Analysis (Mainnet Only)

If [Slither](https://github.com/crytic/slither) is installed:

```bash
slither .
```

A `slither.config.json` is provided that excludes test/script files and suppresses known informational findings.

---

## Contract Parameters Reference

The contract constructor takes two parameters:

```solidity
constructor(address admin, address minter)
```

| Parameter | Role Granted | Capabilities | Recommended Wallet Type |
|-----------|-------------|--------------|------------------------|
| `admin` | DEFAULT_ADMIN_ROLE, PAUSER_ROLE | Grant/revoke roles, pause/unpause | Safe multisig |
| `minter` | MINTER_ROLE | mint(), mintForDeed() | Dedicated EOA |

### On-chain Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `name()` | `"SaThuCoin"` | Token name |
| `symbol()` | `"SATHU"` | Token symbol |
| `decimals()` | `18` | Decimal places |
| `cap()` | `1,000,000,000 SATHU` | Maximum total supply |
| `MAX_MINT_PER_TX` | `10,000 SATHU` | Max tokens per mint call |
| `MAX_DAILY_MINT` | `500,000 SATHU` | Max tokens minted per day |

### Supported Interfaces (ERC165)

- `IERC20` — Standard ERC-20
- `IERC20Permit` — Gasless approvals (EIP-2612)
- `IAccessControl` — Role-based access control
- `IERC165` — Interface detection

---

## Network Reference

### Base Sepolia (Testnet)

| Property | Value |
|----------|-------|
| Chain ID | `84532` |
| RPC | `https://sepolia.base.org` |
| Block Explorer | `https://sepolia.basescan.org` |
| Faucet | [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet) |
| Confirmations | 2 |
| Currency | ETH (testnet) |

### Base Mainnet

| Property | Value |
|----------|-------|
| Chain ID | `8453` |
| RPC | Use private provider (see [RPC Provider Setup](#rpc-provider-setup)) |
| Block Explorer | `https://basescan.org` |
| Bridge | [bridge.base.org](https://bridge.base.org/) |
| Confirmations | 5 |
| Currency | ETH |

### Funding Your Deployer

**Testnet:** Use the [Base Sepolia faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet). You need approximately 0.005 ETH.

**Mainnet:** Bridge ETH from Ethereum mainnet to Base using the [official bridge](https://bridge.base.org/), or transfer from a centralized exchange that supports Base.

---

## Testnet Deployment Walkthrough

This is the complete sequence for a testnet deployment.

### Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] `npm install` completed
- [ ] `npm test` passes all tests
- [ ] `.env` file created with `PRIVATE_KEY` and `BASESCAN_API_KEY`
- [ ] Deployer wallet funded with ~0.005 Base Sepolia ETH

### Step 1: Deploy

```bash
npm run deploy:testnet
```

The script will output:
```
═══════════════════════════════════════════
  SaThuCoin Deployment
═══════════════════════════════════════════
  Network:  base-sepolia
  Chain ID: 84532
  Deployer: 0x...
  Admin:    0x...
  Minter:   0x...
  Balance:  0.05 ETH
═══════════════════════════════════════════

  Estimating deployment gas...
  Estimated gas:  1533985
  Gas price:      0.1 gwei
  Estimated cost: 0.000153 ETH

  Deploying SaThuCoin...

  Waiting for 2 block confirmations...
  2 confirmations received.

  SaThuCoin deployed!
   Address:    0x...
   Tx Hash:    0x...
   Block:      12345
   Gas Used:   1533985

  Contract State:
   Name:         SaThuCoin
   Symbol:       SATHU
   Total Supply: 0.0 SATHU
   Admin role:   0x... -> true
   Minter role:  0x... -> true
   Pauser role:  0x... -> true

  Deployment info saved to: data/deployment.json

  To verify on BaseScan, wait ~60 seconds then run:
   npx hardhat run scripts/verify.js --network base-sepolia

═══════════════════════════════════════════
  Deployment complete!
═══════════════════════════════════════════
```

### Step 2: Verify on BaseScan

Wait approximately 60 seconds for the block explorer to index the contract, then:

```bash
npm run verify:testnet
```

The script reads `data/deployment.json` and submits the source code with constructor arguments to BaseScan.

### Step 3: View on BaseScan

Open the contract address on the block explorer:
```
https://sepolia.basescan.org/address/<CONTRACT_ADDRESS>
```

Verify:
- Source code is verified (green checkmark on the "Contract" tab)
- Read contract: `name()` returns "SaThuCoin", `symbol()` returns "SATHU", `totalSupply()` returns 0

### Step 4: Test Minting

```bash
# Dry run first (estimates gas, no transaction sent)
npx hardhat mint \
  --to 0xYOUR_RECIPIENT_ADDRESS \
  --amount 10 \
  --deed "Test donation" \
  --dry-run \
  --network base-sepolia

# Actual mint
npx hardhat mint \
  --to 0xYOUR_RECIPIENT_ADDRESS \
  --amount 10 \
  --deed "Test donation" \
  --network base-sepolia
```

The mint CLI:
- Validates the recipient address (EIP-55 checksum)
- Checks the signer has `MINTER_ROLE`
- Checks the contract is not paused
- Checks the amount is within `MAX_MINT_PER_TX` (10,000)
- Displays gas estimate
- Reports updated balance and total supply after minting

---

## Mainnet Deployment Walkthrough

### Pre-Deployment Checklist

Complete ALL items before proceeding:

- [ ] **Code Quality**
  - [ ] All tests pass: `npm test`
  - [ ] 100% code coverage: `npm run coverage`
  - [ ] Contract size under 24 kB: `npm run size`
  - [ ] Solidity linter passes: `npm run lint:sol`
  - [ ] Static analysis clean (Slither): `slither .`

- [ ] **Security Review**
  - [ ] Security deep dive document reviewed (`docs/SaThuCoin comprehensive security deep dive.md`)
  - [ ] External audit completed (if applicable)
  - [ ] No known vulnerabilities

- [ ] **Wallet Setup**
  - [ ] Safe multisig created on Base Mainnet (for admin)
  - [ ] Safe has 2-of-3 or 3-of-5 signer configuration
  - [ ] Signers use hardware wallets
  - [ ] Dedicated minter EOA generated
  - [ ] Minter private key stored securely

- [ ] **Infrastructure**
  - [ ] Private RPC endpoint configured (Alchemy, QuickNode, etc.)
  - [ ] BaseScan API key obtained

- [ ] **Environment**
  - [ ] `.env` file configured with all required variables
  - [ ] `ADMIN_ADDRESS` set to Safe multisig address
  - [ ] `MINTER_ADDRESS` set to minter EOA address
  - [ ] `RPC_URL_MAINNET` set to private RPC endpoint
  - [ ] `PRIVATE_KEY` set to deployer private key
  - [ ] `BASESCAN_API_KEY` set

- [ ] **Funding**
  - [ ] Deployer wallet funded with sufficient ETH (0.005+ ETH)
  - [ ] Minter wallet funded with ETH for future mint transactions

### Step 1: Final Verification

```bash
# Clean build from scratch
npm run clean
npm run compile
npm test
npm run coverage
npm run size
```

### Step 2: Deploy

```bash
npm run deploy:mainnet
```

The script will:
1. Display deployer balance and estimated gas cost
2. Warn if using public RPC (you should see NO warning if private RPC is configured)
3. Check deployer balance covers gas + 20% safety margin
4. Deploy with constructor args `(ADMIN_ADDRESS, MINTER_ADDRESS)`
5. Wait for 5 block confirmations
6. Verify all three roles are correctly assigned
7. Save deployment info to `data/deployment.json`

### Step 3: Verify on BaseScan

Wait ~60 seconds, then:

```bash
npm run verify:mainnet
```

### Step 4: Post-Deployment Verification

On [basescan.org](https://basescan.org), navigate to the contract address and verify:

1. **Contract tab:** Source code is verified (green checkmark)
2. **Read Contract:**
   - `name()` = "SaThuCoin"
   - `symbol()` = "SATHU"
   - `totalSupply()` = 0
   - `cap()` = 1000000000000000000000000000 (1 billion * 10^18)
   - `paused()` = false
3. **Role verification** (call `hasRole` with the role hash and address):
   - `DEFAULT_ADMIN_ROLE` (`0x0000...0000`) held by Safe multisig
   - `MINTER_ROLE` (`keccak256("MINTER_ROLE")`) held by minter EOA
   - `PAUSER_ROLE` (`keccak256("PAUSER_ROLE")`) held by Safe multisig

### Step 5: Backup Deployment Artifacts

```bash
# Back up deployment.json to a secure location
cp data/deployment.json /path/to/secure/backup/deployment-mainnet-$(date +%Y%m%d).json
```

The `data/` directory is gitignored. This file contains the contract address, deployer, admin, minter, transaction hash, and other metadata needed for verification and future operations.

---

## Post-Deployment Operations

### Minting Tokens

Use the Hardhat mint task:

```bash
# Mint 10 SATHU for a deed
npx hardhat mint \
  --to 0xRECIPIENT \
  --amount 10 \
  --deed "Donated to Red Cross" \
  --network base-mainnet

# Mint without deed description
npx hardhat mint \
  --to 0xRECIPIENT \
  --amount 10 \
  --network base-mainnet

# Dry run (simulate only)
npx hardhat mint \
  --to 0xRECIPIENT \
  --amount 10 \
  --deed "Test" \
  --dry-run \
  --network base-mainnet
```

**Mint CLI checks:**
- Recipient address must be valid EIP-55 checksum (not zero address)
- Amount must be positive and at most 10,000 SATHU per transaction
- Signer must have `MINTER_ROLE`
- Contract must not be paused

### Role Management (via Safe Multisig)

All role management is done through the Safe multisig UI at [app.safe.global](https://app.safe.global/). Use the "New Transaction" > "Contract Interaction" feature, entering the SaThuCoin contract address and calling the appropriate function.

**Grant a new minter:**
```
Function: grantRole(bytes32 role, address account)
role:    0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6
         (keccak256 of "MINTER_ROLE")
account: <new minter address>
```

**Revoke a minter (key rotation):**
```
1. grantRole(MINTER_ROLE, newMinterAddress)
2. Verify new minter works (test mint)
3. revokeRole(MINTER_ROLE, oldMinterAddress)
```

**Emergency pause:**
```
Function: pause()
(no arguments)
```

**Unpause:**
```
Function: unpause()
(no arguments)
```

### Role Hashes Reference

| Role | Bytes32 Hash |
|------|-------------|
| `DEFAULT_ADMIN_ROLE` | `0x0000000000000000000000000000000000000000000000000000000000000000` |
| `MINTER_ROLE` | `0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6` |
| `PAUSER_ROLE` | `0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a` |

---

## Deployment Artifacts

After deployment, `data/deployment.json` is created with the following structure:

```json
{
  "network": "base-mainnet",
  "chainId": "8453",
  "contractAddress": "0x...",
  "deployer": "0x...",
  "admin": "0x...",
  "minter": "0x...",
  "txHash": "0x...",
  "blockNumber": 12345678,
  "gasUsed": "1533985",
  "timestamp": "2026-02-08T12:00:00.000Z",
  "solidity": "0.8.26",
  "optimizer": {
    "enabled": true,
    "runs": 200
  }
}
```

This file is:
- **Required** by `scripts/verify.js` (for source verification)
- **Required** by `scripts/mint.js` (for minting operations)
- **Gitignored** — never committed to version control
- **Overwritten** on each deployment — back up before redeploying

---

## Troubleshooting

### "Deployer balance too low"

The deploy script requires your balance to exceed the estimated gas cost plus a 20% margin.

```
Solution: Fund the deployer wallet with more ETH.
Testnet: Use the Base Sepolia faucet.
Mainnet: Bridge ETH from Ethereum or transfer from an exchange.
```

### "No deployment.json found"

The verify and mint scripts require `data/deployment.json` created by the deploy script.

```
Solution: Deploy first with `npm run deploy:testnet` or `npm run deploy:mainnet`.
```

### "Network mismatch"

The `deployment.json` was created on a different network than the one you are running against.

```
Solution: Deploy to the correct network, or delete data/deployment.json and redeploy.
The verify/mint scripts validate that deployment.network matches the --network flag.
```

### "Already Verified"

The contract source code was already submitted to BaseScan. This is not an error.

### "Signer does not have MINTER_ROLE"

The wallet in your `PRIVATE_KEY` does not have the MINTER_ROLE on the deployed contract.

```
Solution: Ensure PRIVATE_KEY corresponds to the minter wallet.
Or grant MINTER_ROLE to your address via the admin multisig.
```

### "Contract is paused"

The contract has been paused by a PAUSER_ROLE holder. Minting and transfers are disabled.

```
Solution: Unpause the contract via the admin multisig by calling unpause().
```

### Verification Fails Immediately After Deployment

BaseScan needs time to index the deployment transaction.

```
Solution: Wait 60-120 seconds after deployment before running verify.
```

### "WARNING: Using public RPC endpoint for mainnet"

The deploy script detected you are using the default `https://mainnet.base.org` public RPC.

```
Solution: Set RPC_URL_MAINNET to a private RPC endpoint (Alchemy, QuickNode, etc.).
```

### Gas Estimation Fails

The deployment transaction cannot be estimated, possibly due to network issues or invalid constructor arguments.

```
Solution:
1. Check your RPC endpoint is reachable
2. Verify ADMIN_ADDRESS and MINTER_ADDRESS are valid Ethereum addresses
3. Try again — RPC endpoints can have transient failures
```
