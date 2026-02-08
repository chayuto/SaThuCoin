# SaThuCoin Project: Complete AI Coding Agent Reference Guide

> **Purpose:** This document is the authoritative reference for AI coding agents generating code for the SaThuCoin ERC-20 token project on Base chain.
> Every import path, API signature, and code pattern below reflects the actual library versions as of early 2026.
> The single biggest source of AI coding errors is generating outdated ethers.js v5 or OpenZeppelin v4 syntax — this guide eliminates that.
> **Pin this file in your context window before writing any code.**

---

## Table of Contents

1. [Technology Stack at a Glance](#1-technology-stack-at-a-glance)
2. [Hardhat: Project Setup and Configuration](#2-hardhat-project-setup-and-configuration)
3. [OpenZeppelin Contracts v5: The Correct Patterns](#3-openzeppelin-contracts-v5-the-correct-patterns)
4. [Solidity ^0.8.20: Language Features and Gas Optimization](#4-solidity-0820-language-features-and-gas-optimization)
5. [ethers.js v6: The Critical Migration Reference](#5-ethersjs-v6-the-critical-migration-reference)
6. [Base Chain: Network Configuration and Deployment](#6-base-chain-network-configuration-and-deployment)
7. [Cheerio: HTML Parsing for Wallet Scraping](#7-cheerio-html-parsing-for-wallet-scraping)
8. [axios: HTTP Client for Scraping and API Calls](#8-axios-http-client-for-scraping-and-api-calls)
9. [node-cron: Task Scheduling](#9-node-cron-task-scheduling)
10. [dotenv and Project Structure Patterns](#10-dotenv-and-project-structure-patterns)
11. [Testing Patterns for SaThuCoin](#11-testing-patterns-for-sathucoin)
12. [The Ten Most Dangerous AI Coding Mistakes](#12-the-ten-most-dangerous-ai-coding-mistakes)
13. [Recommended Project File Structure](#13-recommended-project-file-structure)

---

## 1. Technology Stack at a Glance

| Technology | Version | Install | Import (ESM) |
|---|---|---|---|
| Hardhat | 2.x (stable) / 3.x (new) | `npm i -D hardhat` | `import hre from "hardhat"` |
| OpenZeppelin Contracts | 5.4.0 | `npm i @openzeppelin/contracts` | `import {ERC20} from "@openzeppelin/contracts/..."` |
| Solidity | ^0.8.20 (recommend 0.8.24) | via Hardhat compiler | `pragma solidity ^0.8.20;` |
| ethers.js | 6.x | `npm i ethers` | `import { ethers } from "ethers"` |
| Cheerio | 1.2.0 | `npm i cheerio` | `import * as cheerio from "cheerio"` |
| axios | 1.x | `npm i axios` | `import axios from "axios"` |
| node-cron | 4.x | `npm i node-cron` | `import cron from "node-cron"` |
| dotenv | 17.x | `npm i dotenv` | `import "dotenv/config"` |
| nock (testing) | 14.x | `npm i -D nock` | `import nock from "nock"` |
| Vitest (testing) | 3.x | `npm i -D vitest` | `import { describe, it, expect } from "vitest"` |

---

## 2. Hardhat: Project Setup and Configuration

### Version Context

Hardhat 3 is the newest major release with ESM-first architecture and a Rust-based Ethereum Development Runtime (EDR). However, most Base chain tutorials still reference Hardhat 2 patterns. **For SaThuCoin, use Hardhat 2 with `@nomicfoundation/hardhat-toolbox`** for maximum ecosystem compatibility.

### Installation and Project Init

```bash
# Hardhat 2 (recommended)
mkdir sathucoin && cd sathucoin
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts@^5.4.0
npm install dotenv cheerio axios node-cron
npx hardhat init
# Select: "Create a JavaScript project"
```

The `@nomicfoundation/hardhat-toolbox` bundles: hardhat-ethers, hardhat-chai-matchers, hardhat-network-helpers, hardhat-verify, typechain, **ethers.js v6**, chai, and mocha. One install gives you the full testing and deployment stack. **Do NOT install ethers separately.**

### Hardhat 2 Config for Base Chain (hardhat.config.js)

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    "base-sepolia": {
      url: process.env.RPC_URL || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
    },
    "base-mainnet": {
      url: process.env.RPC_URL_MAINNET || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
    },
  },
  etherscan: {
    apiKey: {
      "base-sepolia": process.env.BASESCAN_API_KEY || "",
      "base-mainnet": process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base-sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "base-mainnet",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
};
```

### Hardhat 3 Config for Base Chain (Reference Only)

```typescript
import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxPlugin],
  solidity: {
    profiles: {
      default: { version: "0.8.24" },
      production: {
        version: "0.8.24",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    },
  },
  networks: {
    "base-sepolia": {
      type: "http",
      url: configVariable("BASE_SEPOLIA_RPC_URL"),
      accounts: [configVariable("WALLET_KEY")],
      chainType: "op",  // Critical: marks Base as OP Stack L2
      verify: {
        etherscan: {
          apiUrl: "https://api-sepolia.basescan.org",
          apiKey: configVariable("BASESCAN_API_KEY"),
        },
      },
    },
    "base-mainnet": {
      type: "http",
      url: configVariable("BASE_MAINNET_RPC_URL"),
      accounts: [configVariable("WALLET_KEY")],
      chainType: "op",
      verify: {
        etherscan: {
          apiUrl: "https://api.basescan.org",
          apiKey: configVariable("BASESCAN_API_KEY"),
        },
      },
    },
    hardhat: { type: "edr-simulated", chainType: "op" },
  },
};
export default config;
```

### Key Commands

```bash
# Hardhat 2
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network base-sepolia
npx hardhat verify --network base-sepolia DEPLOYED_ADDRESS
REPORT_GAS=true npx hardhat test

# Hardhat 3
npx hardhat build                    # 'compile' renamed to 'build'
npx hardhat test
npx hardhat ignition deploy ignition/modules/SaThuCoin.ts --network base-sepolia --verify
npx hardhat keystore set WALLET_KEY  # secrets management
```

### Breaking Changes: Hardhat 2 → 3

| What Changed | Hardhat 2 | Hardhat 3 |
|---|---|---|
| Compile command | `npx hardhat compile` | `npx hardhat build` |
| Init command | `npx hardhat init` | `npx hardhat --init` |
| Plugin loading | `require()` side-effects | Explicit `plugins` array |
| Network config | Flat object | `type` ("http"/"edr-simulated") + `chainType` ("l1"/"op"/"generic") |
| Etherscan config | Top-level `etherscan` key | Inside each network's `verify` block |
| Node.js requirement | 16+ | **22+** |
| Module system | CommonJS | **ESM** (`"type": "module"`) |
| Secrets | dotenv | `keystore` plugin |

### Common Hardhat Pitfalls

- **HH8 Invalid Config**: Missing `dotenv` config call or empty environment variables. Always validate env vars exist before using them.
- **Stale artifacts**: Run `npx hardhat clean` then recompile when verification fails with ENOENT errors.
- **Solc version mismatch**: OZ v5.5.0 requires `^0.8.24` in some contracts. Pin OZ to `5.4.0` if using Solidity `^0.8.20`.
- **Etherscan V2 API migration**: Update `@nomicfoundation/hardhat-verify` to latest. Old V1 endpoints are deprecated.
- **gasPrice override on L2**: Setting explicit `gasPrice` in Base config overrides EIP-1559 dynamic pricing. Omit it to let the network set fees — Base's minimum base fee is only **0.002 gwei**.
- **Empty accounts array**: If `PRIVATE_KEY` env var is missing, use a conditional: `accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []` — this prevents crashes during local testing.

---

## 3. OpenZeppelin Contracts v5: The Correct Patterns

### Version and Install

```bash
npm install @openzeppelin/contracts@^5.4.0
```

The latest audited npm release is **5.4.0**. GitHub has v5.5.0 which bumps some contract pragmas to `^0.8.24`. For maximum compatibility with Solidity `^0.8.20`, pin to `5.4.0`.

### Exact Import Paths (Critical for AI Accuracy)

```solidity
// ERC-20
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

// Access Control
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

// Utilities
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
```

All imports **MUST** use named/explicit style with curly braces: `import {ERC20} from "..."` — NOT `import "..."`.

### ⚠️ The Ownable Constructor: Most Common AI Mistake

This is the **#1 error AI coding agents make** with OpenZeppelin v5. The v4 `Ownable()` constructor took no arguments and defaulted to `msg.sender`. In v5, you **must** pass an explicit `initialOwner` address:

```solidity
// ❌ WRONG — v4 pattern, will NOT compile with OZ v5
constructor() ERC20("SaThuCoin", "SATHU") Ownable() { }

// ✅ CORRECT — v5 requires explicit owner address
constructor() ERC20("SaThuCoin", "SATHU") Ownable(msg.sender) { }

// ✅ ALSO CORRECT — parameterized owner
constructor(address initialOwner) ERC20("SaThuCoin", "SATHU") Ownable(initialOwner) { }
```

Passing `address(0)` as owner will revert with `OwnableInvalidOwner(address(0))`.

### Complete v4 → v5 Breaking Changes

| What Changed | v4 (OLD — Do Not Use) | v5 (CURRENT) |
|---|---|---|
| Minimum Solidity | `^0.8.0` | **`^0.8.20`** |
| Error handling | `require("string")` | **Custom errors** (EIP-6093) |
| Ownable constructor | `Ownable()` implicit msg.sender | **`Ownable(initialOwner)`** explicit |
| ERC20 hooks | `_beforeTokenTransfer()` + `_afterTokenTransfer()` | **`_update(from, to, value)`** single override |
| `increaseAllowance()` / `decreaseAllowance()` | Present | **Removed** |
| `_setupRole()` | Present | **Removed** — use `_grantRole()` |
| `SafeMath` | Present | **Removed** (built into Solidity 0.8+) |
| `Counters` | Present | **Removed** (use plain `uint256`) |
| `ERC777` | Present | **Removed** |
| AccessControl revert | String messages | `AccessControlUnauthorizedAccount(account, role)` |

### ERC-20 Custom Errors in v5 (EIP-6093)

OZ v5 ERC20 uses these custom errors internally instead of string reverts:

```solidity
error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
error ERC20InvalidSender(address sender);
error ERC20InvalidReceiver(address receiver);
error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
error OwnableUnauthorizedAccount(address account);
error OwnableInvalidOwner(address owner);
```

These save **~100-150 gas per revert** compared to string messages. In tests, use `.to.be.revertedWithCustomError(contract, "ErrorName")`, NOT `.to.be.revertedWith("string")`.

### Complete SaThuCoin Contract Reference

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SaThuCoin is ERC20, Ownable {

    event DeedRewarded(
        address indexed recipient,
        uint256 amount,
        string deed
    );

    constructor() ERC20("SaThuCoin", "SATHU") Ownable(msg.sender) {
        // No initial supply — starts at zero
    }

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

### PUSH0 Opcode Warning

Solidity `^0.8.20` defaults to Shanghai EVM and generates **PUSH0 opcodes**. Base supports PUSH0, so this is safe for SaThuCoin. However, if deploying the same contract to chains that don't support Shanghai (some older L2s), set `evmVersion: "paris"` in the compiler settings.

---

## 4. Solidity ^0.8.20: Language Features and Gas Optimization

### Key Features by Version

| Version | Key Feature |
|---|---|
| 0.8.20 | PUSH0 opcode (Shanghai EVM default), saves 1 byte + 3 gas per zero-push |
| 0.8.24 | Cancun support: transient storage (`tstore`/`tload`), `MCOPY` |
| 0.8.26 | `require(condition, CustomError())` syntax in via-IR pipeline |
| 0.8.27 | `require(condition, CustomError())` extended to legacy pipeline |

The recommended pragma for SaThuCoin is `^0.8.20` for OZ v5 compatibility, with `0.8.24` as the specific compiler target.

### Custom Errors (The Modern Pattern)

```solidity
// Definition
error InsufficientBalance(uint256 available, uint256 required);
error Unauthorized(address caller);

// Usage with revert (works since 0.8.4)
if (balance < amount) revert InsufficientBalance(balance, amount);

// Usage with require (0.8.27+ for legacy pipeline)
require(balance >= amount, InsufficientBalance(balance, amount));
```

Custom errors use ~100-150 less gas than `require("string message")` and reduce deployed contract size.

### Gas Optimization for Simple ERC-20 Contracts

1. **Custom errors** instead of revert strings — OZ v5 does this already
2. **`immutable` and `constant`** for values set at construction or compile time
3. **`calldata` over `memory`** for read-only function parameters (saves ~60 gas per parameter)
4. **Events for off-chain data** rather than storage (~375 gas vs. ~20,000 gas for new storage slot)
5. **Avoid unnecessary storage writes** — most expensive EVM operation

OpenZeppelin's ERC20 is already well-optimized. Don't over-engineer the base token.

### Common Solidity Pitfalls AI Coders Make

- **Forgetting decimals**: ERC20 uses 18 decimals by default. `1 token = 1e18` in raw units. Always use `10 ** decimals()` or `ethers.parseEther()` for supply calculations.
- **Using SafeMath**: Completely unnecessary since Solidity 0.8.0. Removed from OZ v5. Import will fail.
- **Using `_beforeTokenTransfer`**: Does not exist in OZ v5. Override `_update(from, to, value)` instead.
- **`require("string")` vs custom errors**: String reverts waste gas. Always prefer custom errors.
- **Missing access control**: AI often generates `public` functions that should be `onlyOwner`. Always verify function visibility on mint, burn, pause, and admin functions.

---

## 5. ethers.js v6: The Critical Migration Reference

> ⚠️ **This is the most important section in the entire guide.**
> AI coding agents trained on pre-2023 data will generate ethers.js v5 syntax by default.
> Every pattern below is verified against ethers.js **6.x**.

### The Namespace Revolution

In v6, the `ethers.providers.*`, `ethers.utils.*`, and `ethers.constants.*` namespaces were **completely removed**. Everything moved to the top-level `ethers` object. The `BigNumber` class was replaced with native JavaScript `BigInt`.

### Provider Creation

```javascript
// ❌ WRONG (v5 syntax — will throw "ethers.providers is undefined")
const provider = new ethers.providers.JsonRpcProvider(url);

// ✅ CORRECT (v6)
const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

// With static network (avoids eth_chainId call — more efficient)
const baseNetwork = new ethers.Network("base-sepolia", 84532n);
const provider = new ethers.JsonRpcProvider(
  "https://sepolia.base.org",
  baseNetwork,
  { staticNetwork: baseNetwork }
);

// ❌ WRONG (v5)
const provider = new ethers.providers.Web3Provider(window.ethereum);
// ✅ CORRECT (v6)
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner(); // NOW ASYNC in v6!
```

### BigNumber → BigInt (The #1 Breaking Change)

```javascript
// ❌ WRONG (v5)
const amount = ethers.BigNumber.from("1000000");
const sum = amount.add(ethers.BigNumber.from("500"));
const isZero = amount.isZero();

// ✅ CORRECT (v6 — native BigInt)
const amount = 1000000n;           // or BigInt("1000000")
const sum = amount + 500n;         // native operators
const isZero = amount === 0n;      // use === not ==
const doubled = amount * 2n;
const half = amount / 2n;
```

All contract return values that were `BigNumber` in v5 are now native `bigint` in v6.

### Utility Functions (Flattened Namespace)

| ❌ WRONG (v5) | ✅ CORRECT (v6) |
|---|---|
| `ethers.utils.parseEther("1.0")` | `ethers.parseEther("1.0")` |
| `ethers.utils.formatEther(wei)` | `ethers.formatEther(wei)` |
| `ethers.utils.parseUnits("10.0", 6)` | `ethers.parseUnits("10.0", 6)` |
| `ethers.utils.formatUnits(value, 6)` | `ethers.formatUnits(value, 6)` |
| `ethers.utils.keccak256(data)` | `ethers.keccak256(data)` |
| `ethers.utils.isAddress(addr)` | `ethers.isAddress(addr)` |
| `ethers.utils.getAddress(addr)` | `ethers.getAddress(addr)` |
| `ethers.constants.AddressZero` | `ethers.ZeroAddress` |
| `ethers.constants.HashZero` | `ethers.ZeroHash` |
| `ethers.constants.MaxUint256` | `ethers.MaxUint256` |
| `ethers.utils.arrayify(value)` | `ethers.getBytes(value)` |
| `ethers.utils.hexlify(value)` | `ethers.hexlify(value)` |
| `ethers.utils.solidityKeccak256(t, v)` | `ethers.solidityPackedKeccak256(t, v)` |
| `ethers.utils.formatBytes32String(text)` | `ethers.encodeBytes32String(text)` |
| `ethers.utils.parseBytes32String(b32)` | `ethers.decodeBytes32String(b32)` |

**Return types changed**: `parseEther()` returns `bigint` (not `BigNumber`). `formatEther()` returns `string`. `getBalance()` returns `bigint`.

### Wallet and Signer Creation

```javascript
// v6 — Wallet creation
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// v6 — Connect wallet to provider
const connectedWallet = wallet.connect(provider);
```

### Contract Interaction (Major Changes)

| ❌ WRONG (v5) | ✅ CORRECT (v6) |
|---|---|
| `contract.address` | `contract.target` or `await contract.getAddress()` |
| `await contract.deployed()` | `await contract.waitForDeployment()` |
| `contract.deployTransaction` | `contract.deploymentTransaction()` |
| `await contract.callStatic.foo(args)` | `await contract.foo.staticCall(args)` |
| `await contract.estimateGas.foo(args)` | `await contract.foo.estimateGas(args)` |
| `await contract.populateTransaction.foo(args)` | `await contract.foo.populateTransaction(args)` |

### Transaction Handling

```javascript
// Send transaction and wait
const tx = await contract.transfer(recipient, ethers.parseEther("1.0"));
const receipt = await tx.wait();    // returns TransactionReceipt or null
console.log("Block:", receipt.blockNumber);
console.log("Gas used:", receipt.gasUsed.toString());

// Wait for specific confirmations
const receipt = await tx.wait(3);   // wait for 3 confirmations

// ❌ WRONG (v5) — confirmations is a property
const conf = receipt.confirmations;
// ✅ CORRECT (v6) — confirmations is an async method
const conf = await receipt.confirmations();

// Deploy and wait
const factory = new ethers.ContractFactory(abi, bytecode, signer);
const contract = await factory.deploy(constructorArg1);
await contract.waitForDeployment();  // NOT .deployed()
const address = await contract.getAddress();
```

### Event Listening and Filtering

```javascript
// Listen for Transfer events
contract.on("Transfer", (from, to, value, event) => {
  console.log(`${from} → ${to}: ${ethers.formatEther(value)} SATHU`);
});

// Listen with filter
const filter = contract.filters.Transfer(null, myAddress);
contract.on(filter, (event) => {
  const [from, to, value] = event.args;
  console.log(`Received ${ethers.formatEther(value)} SATHU from ${from}`);
});

// Query historical events
const events = await contract.queryFilter(contract.filters.Transfer(), -1000);
for (const event of events) {
  if (event instanceof ethers.EventLog) {
    console.log(event.args.from, event.args.to, event.args.value);
  }
}

// Clean up
await contract.removeAllListeners("Transfer");
```

### Error Handling in v6

```javascript
import { isError } from "ethers";

try {
  await contract.someMethod();
} catch (error) {
  if (isError(error, "CALL_EXCEPTION")) {
    console.log("Revert reason:", error.reason);
    console.log("Revert data:", error.data);
  }
  if (isError(error, "INSUFFICIENT_FUNDS")) {
    console.log("Not enough ETH for gas");
  }
}
```

### Hardhat + ethers v6 Integration

In Hardhat 2, ethers is accessed through `hre.ethers` (or `const { ethers } = require("hardhat")`) which provides all standard v6 functions plus Hardhat-specific helpers:

```javascript
const { ethers } = require("hardhat");

// Hardhat-specific helpers
const [owner, addr1, addr2] = await ethers.getSigners();
const Token = await ethers.getContractFactory("SaThuCoin");
const token = await ethers.deployContract("SaThuCoin");
await token.waitForDeployment();
const deployed = await ethers.getContractAt("SaThuCoin", "0x...");
```

### Complete Standalone ERC-20 Interaction Example (Outside Hardhat)

```javascript
const { ethers } = require("ethers");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function mintForDeed(address to, uint256 amount, string deed)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event DeedRewarded(address indexed recipient, uint256 amount, string deed)",
];

const token = new ethers.Contract(process.env.CONTRACT_ADDRESS, ERC20_ABI, wallet);

// Read operations (all return bigint in v6)
const name = await token.name();           // "SaThuCoin"
const decimals = await token.decimals();   // 18n
const balance = await token.balanceOf(wallet.address);
console.log(`Balance: ${ethers.formatUnits(balance, decimals)} ${name}`);

// Write operation — mint for deed
const tx = await token.mintForDeed(
  "0xRECIPIENT",
  ethers.parseEther("50"),
  "Charity Alpha Foundation"
);
const receipt = await tx.wait();
console.log(`Confirmed in block ${receipt.blockNumber}`);
```

---

## 6. Base Chain: Network Configuration and Deployment

### Network Reference

| Property | Base Mainnet | Base Sepolia |
|---|---|---|
| **Chain ID** | **8453** | **84532** |
| **RPC** | `https://mainnet.base.org` | `https://sepolia.base.org` |
| **Explorer** | `https://basescan.org` | `https://sepolia.basescan.org` |
| **Explorer API** | `https://api.basescan.org/api` | `https://api-sepolia.basescan.org/api` |
| **Currency** | ETH | ETH |
| **Block time** | ~2 seconds | ~2 seconds |

Public RPC endpoints are **rate-limited and not for production**. For reliable access, use:
- Alchemy: `https://base-mainnet.g.alchemy.com/v2/<key>`
- QuickNode, Chainstack, or Infura

### Gas Pricing on Base vs Ethereum L1

Base uses a **two-component fee model**:

```
Total Fee = L2 Execution Fee + L1 Security Fee
```

- **L2 Execution Fee**: Follows EIP-1559 with a minimum base fee of just **0.002 gwei** on mainnet (vs. Ethereum L1's typical 10-30 gwei).
- **L1 Security Fee**: Covers the cost of posting transaction data to Ethereum L1 for data availability. Fluctuates independently with L1 congestion.

A typical 200,000-gas transaction at minimum base fee costs approximately **$0.001** at $2500 ETH. Gas usage per opcode is identical to Ethereum — only the price per gas unit differs.

**Important**: Do not hardcode `gasPrice` in your Hardhat config for Base. Let the network set fees dynamically via EIP-1559.

### Base Sepolia Faucets

| Faucet | URL | Limits |
|---|---|---|
| Alchemy | `alchemy.com/faucets/base-sepolia` | Free account required |
| Superchain | `app.optimism.io/faucet` | Requires onchain identity |
| Coinbase CDP | Portal UI or SDK | 0.1 ETH/24h |
| Chainlink | `faucets.chain.link/base-sepolia` | Free |
| QuickNode | `faucet.quicknode.com/base/sepolia` | 1 drip/12h |
| LearnWeb3 | `learnweb3.io/faucets` | 1 claim/24h |

### Deployment Script Pattern

```javascript
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH");

  const SaThuCoin = await hre.ethers.getContractFactory("SaThuCoin");
  const token = await SaThuCoin.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("SaThuCoin deployed to:", address);

  // Save deployment info
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(
    path.join(dataDir, "deployment.json"),
    JSON.stringify({
      network: hre.network.name,
      chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
      contractAddress: address,
      deployer: deployer.address,
      txHash: token.deploymentTransaction().hash,
      timestamp: new Date().toISOString(),
    }, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Contract Verification

```bash
# Wait ~60 seconds after deployment for BaseScan indexing, then:
npx hardhat verify --network base-sepolia 0xDEPLOYED_ADDRESS
```

Common verification failures:
- **Wait at least 60 seconds** after deployment before verifying.
- Ensure the exact compiler version and optimizer settings match.
- Run `npx hardhat clean` before recompiling if artifacts are stale.
- SaThuCoin has no constructor arguments, so no `--constructor-args` needed.

---

## 7. Cheerio: HTML Parsing for Wallet Scraping

### Setup and Import

```bash
npm install cheerio
```

```javascript
// Must use namespace import for full API
import * as cheerio from "cheerio";
// OR in CommonJS:
const cheerio = require("cheerio");
```

Cheerio **1.x** is a fast, jQuery-like HTML parser that does **NOT** execute JavaScript — it handles static HTML only. Roughly 20x faster than Puppeteer or JSDOM. Requires Node.js 18.17+.

### Core API Patterns

```javascript
const $ = cheerio.load(htmlString);

// Selectors
$(".class-name")              // by class
$("#element-id")              // by id
$("a[href]")                  // attribute presence
$('div[data-wallet]')         // specific attribute

// Extraction
$(selector).text()            // inner text content (concatenated for multiple matches)
$(selector).html()            // inner HTML
$(selector).attr("href")     // attribute value (undefined if not found)
$(selector).first().text()    // first match only
$(selector).eq(2).text()      // by index (0-based)

// Iteration
$(selector).each((index, element) => {
  const text = $(element).text().trim();
  const href = $(element).attr("href");
});

// Converting to array
const texts = $(selector).map((i, el) => $(el).text().trim()).get();

// Traversal
$(selector).find("child")    // descendants
$(selector).children()       // direct children
$(selector).parent()         // parent element

// Safety: elements not found return empty selection, NOT errors
$(".nonexistent").length     // 0
$(".nonexistent").text()     // "" (empty string)
$(".nonexistent").attr("x")  // undefined
```

### Complete Wallet Scraping Example

```javascript
const cheerio = require("cheerio");
const axios = require("axios");

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

async function scrapeWalletAddresses(url, selector, attribute) {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SaThuCoinBot/1.0)" },
      responseType: "text",
    });

    const $ = cheerio.load(html);
    const addresses = new Set();

    // Extract from specified selector
    $(selector).each((_, el) => {
      let addr;
      if (attribute === "text") {
        addr = $(el).text().trim();
      } else {
        addr = $(el).attr(attribute);
      }
      if (addr && ETH_ADDRESS_REGEX.test(addr)) {
        addresses.add(addr);
      }
    });

    return [...addresses];
  } catch (error) {
    console.error(`Scrape failed for ${url}:`, error.message);
    return [];  // Never crash — return empty on failure
  }
}
```

### Cheerio Pitfalls

- The import must be `import * as cheerio from "cheerio"` (ESM) or `const cheerio = require("cheerio")` (CJS) — a default import (`import cheerio from "cheerio"`) won't expose `cheerio.load()`.
- `.text()` **concatenates** text from ALL matched elements. Use `.first().text()` or `.eq(0).text()` for a specific element.
- `.attr()` returns `undefined` (not `null`) when the attribute doesn't exist. Check truthiness, not null.
- Cheerio 1.0+ added `cheerio.fromURL(url)` for direct fetch-and-parse, but using axios separately gives more control over headers, timeouts, and error handling.

---

## 8. axios: HTTP Client for Scraping and API Calls

### Setup and Import

```bash
npm install axios
```

```javascript
const axios = require("axios");
```

### GET Request with Headers

```javascript
const response = await axios.get("https://example.com/api", {
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; SaThuCoinBot/1.0)",
    "Accept": "text/html,application/xhtml+xml",
  },
  timeout: 15000,
  responseType: "text",    // CRITICAL for HTML scraping (default is "json")
  maxRedirects: 5,
});
// response.data = string (when responseType is "text")
// response.status = 200
// response.headers = {...}
```

### Error Handling Pattern

```javascript
try {
  const response = await axios.get(url, { timeout: 15000 });
  return response.data;
} catch (error) {
  if (error.response) {
    // Server responded with non-2xx status
    console.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
  } else if (error.request) {
    // No response received (network/timeout)
    if (error.code === "ECONNABORTED") {
      console.error("Request timed out");
    } else {
      console.error("Network error:", error.message);
    }
  } else {
    // Request setup error
    console.error("Request setup error:", error.message);
  }
  return null;
}
```

### Manual Retry Pattern (Exponential Backoff)

```javascript
async function fetchWithRetry(url, options = {}, retries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await axios.get(url, { timeout: 15000, ...options });
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
      console.warn(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

### Key Pitfalls

- Default `responseType` is `"json"` — set to `"text"` when fetching HTML pages.
- `error.response` is `undefined` for network errors — always check it exists before accessing `.status`.
- axios does NOT throw on 3xx redirects by default (it follows them). It throws on 4xx and 5xx.
- Set `timeout` explicitly — the default is 0 (no timeout), which can hang forever.

---

## 9. node-cron: Task Scheduling

### Setup and Import

```bash
npm install node-cron
```

```javascript
const cron = require("node-cron");
```

node-cron **4.x** provides in-process cron scheduling. It has **no persistence** — jobs are lost on process crash/restart.

### Cron Expression Reference

```
# ┌────────────── second (optional, 0-59)
# │ ┌──────────── minute (0-59)
# │ │ ┌────────── hour (0-23)
# │ │ │ ┌──────── day of month (1-31)
# │ │ │ │ ┌────── month (1-12)
# │ │ │ │ │ ┌──── day of week (0-7, 0 or 7 = Sunday)
# * * * * * *
```

| Expression | Runs |
|---|---|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Top of every hour |
| `0 */6 * * *` | Every 6 hours (SaThuCoin default) |
| `0 0 * * *` | Daily at midnight |
| `0 9 * * 1-5` | Weekdays at 9 AM |

### Complete Scheduler with Graceful Shutdown

```javascript
const cron = require("node-cron");

let isShuttingDown = false;

const task = cron.schedule("0 */6 * * *", async () => {
  if (isShuttingDown) return;
  console.log(`[${new Date().toISOString()}] Running scrape cycle...`);
  try {
    await runScrapeCycle();
  } catch (error) {
    console.error("Scrape cycle failed:", error.message);
    // Don't crash — just log and wait for next cycle
  }
}, { timezone: "UTC" });

// Graceful shutdown
function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  isShuttingDown = true;
  task.stop();
  setTimeout(() => process.exit(0), 5000);  // Grace period for in-flight operations
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.log("SaThuCoin scheduler started. Running every 6 hours.");
```

### Key Pitfalls

- **Always wrap async callbacks in try/catch** — node-cron does NOT auto-catch async errors. An unhandled rejection will crash the process.
- node-cron has **no persistence** — if the process restarts, it doesn't remember past executions or catch up on missed runs.
- The 6-field cron (with seconds) is supported but optional. 5-field is the standard.
- Use `{ timezone: "UTC" }` for consistent behavior across environments.

---

## 10. dotenv and Project Structure Patterns

### Environment Management

```bash
npm install dotenv
```

```javascript
// CommonJS — must be at the TOP of your entry point
require("dotenv").config();

// ESM
import "dotenv/config";
```

Note: Node.js v20.6.0+ has a native `--env-file=.env` flag that can replace dotenv entirely: `node --env-file=.env script.js`.

### .env File for SaThuCoin

```env
# .env (NEVER commit this file)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
RPC_URL=https://sepolia.base.org
RPC_URL_MAINNET=https://mainnet.base.org
BASESCAN_API_KEY=YOUR_BASESCAN_API_KEY
CONTRACT_ADDRESS=0xDEPLOYED_CONTRACT_ADDRESS
SCRAPE_INTERVAL=0 */6 * * *
```

### Validating Environment Variables at Startup

```javascript
require("dotenv").config();

function requireEnv(key) {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

const config = {
  privateKey: requireEnv("PRIVATE_KEY"),
  contractAddress: requireEnv("CONTRACT_ADDRESS"),
  rpcUrl: process.env.RPC_URL || "https://sepolia.base.org",
  basescanApiKey: process.env.BASESCAN_API_KEY || "",
  scrapeInterval: process.env.SCRAPE_INTERVAL || "0 */6 * * *",
};

module.exports = config;
```

### JSON State Management (Atomic Writes)

```javascript
const fs = require("fs");

const STATE_FILE = "./scraper/state/seen-wallets.json";

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch (e) {
    if (e.code === "ENOENT") return {};  // File doesn't exist yet
    throw e;
  }
}

function saveState(state) {
  const tmp = STATE_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
  fs.renameSync(tmp, STATE_FILE);  // Atomic rename prevents corruption on crash
}
```

### CLI Argument Parsing (No Dependencies)

```javascript
// Built-in Node.js (v18.11+)
const { parseArgs } = require("node:util");

const { values } = parseArgs({
  options: {
    to: { type: "string" },
    amount: { type: "string" },
    deed: { type: "string", default: "" },
    "dry-run": { type: "boolean", default: false },
  },
  strict: true,
});

// Usage: node cli/mint.js --to 0x123... --amount 50 --deed "Volunteered"
console.log(values.to, values.amount, values.deed, values["dry-run"]);
```

### Structured Logging

```javascript
function log(level, message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  const output = level === "error" ? console.error : console.log;
  output(JSON.stringify(entry));
}

// Usage
log("info", "Mint successful", { to: "0xabc...", amount: "50", txHash: "0x..." });
log("error", "Mint failed", { error: "INSUFFICIENT_FUNDS", wallet: "0xabc..." });
```

### Retry Logic Utility

```javascript
async function withRetry(fn, { retries = 3, baseDelay = 1000, label = "operation" } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
      console.warn(`[${label}] Attempt ${attempt}/${retries} failed. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Usage
const receipt = await withRetry(
  () => token.mintForDeed(wallet, amount, deed).then(tx => tx.wait()),
  { retries: 3, label: "mint-for-deed" }
);
```

---

## 11. Testing Patterns for SaThuCoin

### Smart Contract Tests (Hardhat + Chai + ethers v6)

```javascript
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SaThuCoin", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const SaThuCoin = await ethers.getContractFactory("SaThuCoin");
    const token = await SaThuCoin.deploy();
    await token.waitForDeployment();
    return { token, owner, alice, bob };
  }

  it("should set deployer as owner", async function () {
    const { token, owner } = await loadFixture(deployFixture);
    expect(await token.owner()).to.equal(owner.address);
  });

  it("should have zero initial supply", async function () {
    const { token } = await loadFixture(deployFixture);
    expect(await token.totalSupply()).to.equal(0n);  // BigInt in v6
  });

  it("should allow owner to mint", async function () {
    const { token, alice } = await loadFixture(deployFixture);
    const amount = ethers.parseEther("100");
    await token.mint(alice.address, amount);
    expect(await token.balanceOf(alice.address)).to.equal(amount);
  });

  it("should emit DeedRewarded on mintForDeed", async function () {
    const { token, alice } = await loadFixture(deployFixture);
    const amount = ethers.parseEther("50");
    await expect(token.mintForDeed(alice.address, amount, "Charity Alpha"))
      .to.emit(token, "DeedRewarded")
      .withArgs(alice.address, amount, "Charity Alpha");
  });

  it("should reject non-owner mint", async function () {
    const { token, alice, bob } = await loadFixture(deployFixture);
    await expect(
      token.connect(alice).mint(bob.address, ethers.parseEther("100"))
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
      .withArgs(alice.address);
  });

  it("should track balance changes on transfer", async function () {
    const { token, alice, bob } = await loadFixture(deployFixture);
    await token.mint(alice.address, ethers.parseEther("100"));
    await expect(
      token.connect(alice).transfer(bob.address, ethers.parseEther("40"))
    ).to.changeTokenBalances(
      token,
      [alice, bob],
      [ethers.parseEther("-40"), ethers.parseEther("40")]
    );
  });
});
```

**Key testing patterns:**
- Use `loadFixture()` for snapshot-based test isolation — far faster than redeploying in `beforeEach`.
- Use `.to.changeTokenBalances()` for balance assertions.
- Use `.to.be.revertedWithCustomError(contract, "ErrorName")` for OZ v5 custom errors — NOT `.to.be.revertedWith("string")`.
- Use `.connect(signer)` to send transactions from different accounts.
- All BigNumber comparisons use native `bigint` (e.g., `0n`, not `BigNumber.from(0)`).

### Scraper Tests (Vitest + nock)

```bash
npm install --save-dev vitest nock
```

```javascript
// test/scraper.test.js
const { describe, it, expect, beforeEach, afterEach } = require("vitest");
const nock = require("nock");

describe("HTML Adapter", () => {
  beforeEach(() => nock.disableNetConnect());
  afterEach(() => { nock.cleanAll(); nock.enableNetConnect(); });

  it("extracts wallet addresses from HTML", async () => {
    nock("https://charity.org")
      .get("/donors")
      .reply(200, `
        <ul>
          <li class="donor-wallet">0xAbC1230000000000000000000000000000004567</li>
          <li class="donor-wallet">0xDeF4560000000000000000000000000000007890</li>
        </ul>
      `);

    const addresses = await htmlAdapter.fetch({
      url: "https://charity.org/donors",
      selector: ".donor-wallet",
      attribute: "text",
    });

    expect(addresses).toHaveLength(2);
    expect(addresses).toContain("0xAbC1230000000000000000000000000000004567");
  });

  it("returns empty array on network error", async () => {
    nock("https://charity.org").get("/donors").replyWithError("ECONNREFUSED");
    const addresses = await htmlAdapter.fetch({
      url: "https://charity.org/donors",
      selector: ".donor-wallet",
      attribute: "text",
    });
    expect(addresses).toEqual([]);
  });
});
```

---

## 12. The Ten Most Dangerous AI Coding Mistakes

These are the errors AI coding agents make most frequently when generating code for ERC-20 projects, ranked by how often they cause build failures or runtime bugs:

| # | Mistake | Wrong | Correct |
|---|---|---|---|
| 1 | ethers provider namespace | `ethers.providers.JsonRpcProvider` | `ethers.JsonRpcProvider` |
| 2 | ethers utils namespace | `ethers.utils.parseEther()` | `ethers.parseEther()` |
| 3 | BigNumber instead of BigInt | `ethers.BigNumber.from()` | Native `1000n` / `BigInt("1000")` |
| 4 | OZ Ownable constructor | `Ownable()` no args | `Ownable(msg.sender)` |
| 5 | OZ ERC20 hooks | `_beforeTokenTransfer()` | `_update(from, to, value)` |
| 6 | Contract address property | `contract.address` | `contract.target` / `getAddress()` |
| 7 | Deploy wait method | `contract.deployed()` | `contract.waitForDeployment()` |
| 8 | Using SafeMath | `import SafeMath` | Don't import — built into Solidity 0.8+ |
| 9 | Static call syntax | `contract.callStatic.foo()` | `contract.foo.staticCall()` |
| 10 | Missing access control | `public` on sensitive functions | `external onlyOwner` |

### Version Specification Prompt Pattern

When using any AI coding assistant for this project, always include:

> Use ethers.js v6 syntax (NOT v5). Use OpenZeppelin v5 contracts (NOT v4). Target Solidity ^0.8.20. Use Hardhat 2 with @nomicfoundation/hardhat-toolbox. Deploy to Base chain (chainId 84532 for testnet, 8453 for mainnet).

---

## 13. Recommended Project File Structure

```
sathucoin/
├── contracts/
│   └── SaThuCoin.sol              # ERC-20 token contract
├── test/
│   ├── SaThuCoin.test.js          # Smart contract tests (Hardhat + Chai)
│   └── scraper.test.js            # Scraper unit tests (Vitest + nock)
├── scripts/
│   ├── deploy.js                  # Deployment script
│   └── verify.js                  # BaseScan verification script
├── scraper/
│   ├── index.js                   # Main entry — runs full scrape+mint cycle
│   ├── scheduler.js               # node-cron scheduler
│   ├── engine.js                  # Core scrape logic
│   ├── minter.js                  # Contract interaction
│   ├── adapters/
│   │   ├── base.js                # Base adapter interface
│   │   ├── html.js                # Cheerio HTML scraper
│   │   └── api.js                 # JSON API adapter
│   ├── state/
│   │   ├── manager.js             # Read/write seen-wallets state
│   │   └── seen-wallets.json      # Persistent state (gitignored)
│   └── utils/
│       ├── logger.js              # Structured logging
│       ├── wallet-validator.js    # ETH address validation
│       └── retry.js               # Retry logic
├── cli/
│   ├── mint.js                    # Manual mint CLI
│   ├── scrape.js                  # Manual scrape trigger
│   ├── balance.js                 # Check SATHU balance
│   ├── supply.js                  # Check total supply
│   └── add-source.js             # Add new source site
├── config/
│   ├── sources.json               # Source site definitions
│   └── rewards.json               # Reward amounts and settings
├── data/                          # Runtime data (gitignored)
│   ├── deployment.json
│   ├── mint-log.json
│   └── scrape-log.json
├── docs/
│   ├── SETUP.md
│   ├── DEPLOYMENT.md
│   ├── CLI_USAGE.md
│   ├── ADDING_SOURCES.md
│   └── ARCHITECTURE.md
├── hardhat.config.js
├── package.json
├── .env                           # Secrets (NEVER commit)
├── .env.example                   # Template (commit this)
├── .gitignore
├── LICENSE                        # MIT
├── README.md
├── CONTRIBUTING.md
└── PROJECT_PLAN.md
```

---

## Quick Reference Card

Copy this into your AI agent's context window for every prompt:

```
PROJECT: SaThuCoin (SATHU) — ERC-20 on Base chain
SOLIDITY: ^0.8.20, compile with 0.8.24
OPENZEPPELIN: v5.4.0 — Ownable(msg.sender), NOT Ownable()
ETHERS: v6 — ethers.parseEther(), NOT ethers.utils.parseEther()
BIGNUMBER: Use native BigInt (1000n), NOT ethers.BigNumber
PROVIDER: new ethers.JsonRpcProvider(), NOT ethers.providers.*
CONTRACT: contract.target, NOT contract.address
DEPLOY: waitForDeployment(), NOT deployed()
HARDHAT: v2 + @nomicfoundation/hardhat-toolbox
CHAIN: Base Sepolia (84532) / Base Mainnet (8453)
RPC: https://sepolia.base.org / https://mainnet.base.org
TESTS: .revertedWithCustomError(), NOT .revertedWith("string")
```

---

## Official Documentation Links

| Resource | URL |
|---|---|
| Hardhat Docs | https://hardhat.org/docs |
| OpenZeppelin Contracts 5.x | https://docs.openzeppelin.com/contracts/5.x |
| OpenZeppelin ERC-20 Guide | https://docs.openzeppelin.com/contracts/5.x/erc20 |
| ethers.js v6 Docs | https://docs.ethers.org/v6/ |
| ethers.js v6 Migration Guide | https://docs.ethers.org/v6/migrating/ |
| Solidity Docs | https://docs.soliditylang.org/ |
| Base Docs | https://docs.base.org |
| Base Network Info | https://docs.base.org/base-chain/quickstart/connecting-to-base |
| Base Fees | https://docs.base.org/base-chain/network-information/network-fees |
| Base Faucets | https://docs.base.org/base-chain/tools/network-faucets |
| BaseScan | https://basescan.org |
| Cheerio Docs | https://cheerio.js.org/docs/intro |
| axios Docs | https://axios-http.com/docs/intro |
| node-cron Docs | https://github.com/node-cron/node-cron |
