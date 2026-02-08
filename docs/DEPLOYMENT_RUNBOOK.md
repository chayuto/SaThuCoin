# SaThuCoin Deployment Runbook

> Step-by-step guide for deploying SaThuCoin to Base Sepolia (testnet) and Base Mainnet.

---

## Prerequisites

- Node.js 18+
- Funded deployer wallet (Base Sepolia ETH or Base Mainnet ETH)
- BaseScan API key (for contract verification)
- Private RPC endpoint for mainnet (Alchemy, QuickNode, etc.)

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
# Required
PRIVATE_KEY=<deployer-private-key-without-0x>
BASESCAN_API_KEY=<basescan-api-key>

# Optional (defaults shown)
RPC_URL=https://sepolia.base.org
RPC_URL_MAINNET=https://mainnet.base.org

# AccessControl role addresses (default: deployer address)
ADMIN_ADDRESS=<safe-multisig-address>
MINTER_ADDRESS=<minter-eoa-address>
```

**Never commit `.env` to version control.**

---

## Testnet Deployment (Base Sepolia)

### 1. Fund the Deployer

Get Base Sepolia ETH from a faucet. Minimum ~0.005 ETH needed.

### 2. Deploy

```bash
npm run deploy:testnet
```

This will:
- Estimate gas and check balance
- Deploy the contract with constructor args `(admin, minter)`
- Wait for 2 block confirmations
- Verify roles are set correctly
- Save deployment info to `data/deployment.json`

### 3. Verify on BaseScan

Wait ~60 seconds after deployment, then:

```bash
npx hardhat run scripts/verify.js --network base-sepolia
```

### 4. Test Minting

```bash
# Dry run (no transaction sent)
npx hardhat mint --to <recipient> --amount 10 --deed "Test" --dry-run --network base-sepolia

# Actual mint
npx hardhat mint --to <recipient> --amount 10 --deed "Test donation" --network base-sepolia
```

---

## Mainnet Deployment (Base Mainnet)

### Pre-deployment Checklist

- [ ] All tests pass: `npm test`
- [ ] 100% coverage: `npx hardhat coverage`
- [ ] Contract size under 24 kB: `npx hardhat size-contracts`
- [ ] Security review completed
- [ ] Safe multisig created for admin role
- [ ] Dedicated minter EOA created
- [ ] Private RPC endpoint configured
- [ ] `ADMIN_ADDRESS` set to Safe multisig
- [ ] `MINTER_ADDRESS` set to minter EOA
- [ ] Deployer wallet funded with sufficient ETH

### 1. Deploy

```bash
npm run deploy:mainnet
```

The script will:
- Warn if using public RPC
- Estimate gas and verify balance (with 20% margin)
- Deploy with constructor args
- Wait for 5 block confirmations
- Verify all three roles (admin, minter, pauser)
- Save deployment info to `data/deployment.json`

### 2. Verify on BaseScan

```bash
npx hardhat run scripts/verify.js --network base-mainnet
```

### 3. Post-deployment Verification

On BaseScan, verify:
- Contract source code is verified
- `DEFAULT_ADMIN_ROLE` is held by the Safe multisig
- `MINTER_ROLE` is held by the minter EOA
- `PAUSER_ROLE` is held by the Safe multisig
- Total supply is 0
- Contract is not paused

---

## Role Management

### Grant a New Minter

Via Safe multisig (admin), call `grantRole(MINTER_ROLE, newMinterAddress)`.

### Revoke a Minter (Key Rotation)

1. Grant MINTER_ROLE to new address
2. Verify new minter can mint (testnet first)
3. Revoke MINTER_ROLE from old address

### Emergency Pause

Via Safe multisig (admin/pauser), call `pause()`. This stops all minting and transfers.

### Transfer Admin

1. Grant DEFAULT_ADMIN_ROLE to new admin
2. New admin grants PAUSER_ROLE to themselves
3. New admin revokes DEFAULT_ADMIN_ROLE from old admin

---

## Deployment Artifacts

After deployment, `data/deployment.json` contains:

```json
{
  "network": "base-sepolia",
  "chainId": "84532",
  "contractAddress": "0x...",
  "deployer": "0x...",
  "admin": "0x...",
  "minter": "0x...",
  "txHash": "0x...",
  "blockNumber": 12345,
  "gasUsed": "1533985",
  "timestamp": "2026-02-08T...",
  "solidity": "0.8.26",
  "optimizer": { "enabled": true, "runs": 200 }
}
```

This file is gitignored. Back it up securely after deployment.
