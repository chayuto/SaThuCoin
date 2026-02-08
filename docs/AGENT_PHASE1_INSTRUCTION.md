# AGENT INSTRUCTION: Phase 1 — Project Bootstrap + Smart Contract

> **Context:** You are setting up a brand new project from an empty directory.
> **Project:** SaThuCoin (SATHU) — an ERC-20 token on Base chain that rewards charitable donors.
> **Your goal:** A fully working Hardhat project with a tested, deployable smart contract.

---

## CRITICAL VERSION CONSTRAINTS

Read these before writing ANY code. Violating these will cause build failures.

```
Hardhat:              2.x (NOT 3.x — ecosystem compatibility)
OpenZeppelin:         5.4.0 (NOT v4 — constructor patterns differ)
Solidity:             0.8.24 (supports PUSH0, compatible with OZ 5.4)
ethers.js:            6.x (bundled via hardhat-toolbox — do NOT install separately)
Node.js:              18+ required
```

### Version-specific rules you MUST follow:

| Rule | Wrong (will break) | Correct |
|------|-------------------|---------|
| OZ Ownable constructor | `Ownable()` | `Ownable(msg.sender)` |
| OZ import style | `import "@openzeppelin/..."` | `import {ERC20} from "@openzeppelin/..."` |
| OZ ERC20 hooks | `_beforeTokenTransfer()` | `_update(from, to, value)` |
| OZ error handling | `require("string message")` | Custom errors: `revert ErrorName()` |
| ethers provider | `ethers.providers.JsonRpcProvider` | `ethers.JsonRpcProvider` |
| ethers utils | `ethers.utils.parseEther()` | `ethers.parseEther()` |
| ethers BigNumber | `ethers.BigNumber.from()` | Native `BigInt` / `1000n` |
| ethers contract address | `contract.address` | `contract.target` or `await contract.getAddress()` |
| ethers deploy wait | `await contract.deployed()` | `await contract.waitForDeployment()` |
| ethers static call | `contract.callStatic.foo()` | `contract.foo.staticCall()` |
| Hardhat test reverts | `.to.be.revertedWith("string")` | `.to.be.revertedWithCustomError(contract, "ErrorName")` |

---

## STEP 1: Initialize project

Run these commands in order from the empty project root directory:

```bash
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts@^5.4.0
npm install dotenv
npm install cheerio axios node-cron
```

**Why each package:**
- `hardhat` + `@nomicfoundation/hardhat-toolbox` — Dev framework. Toolbox bundles ethers v6, chai, mocha, hardhat-verify, hardhat-network-helpers, typechain. Do NOT install ethers separately.
- `@openzeppelin/contracts@^5.4.0` — Audited ERC-20 and Ownable. Pin to 5.4.x.
- `dotenv` — Load .env secrets.
- `cheerio`, `axios`, `node-cron` — Scraper dependencies (used in later phases, install now).

After install, initialize Hardhat:

```bash
npx hardhat init
```

Select: **"Create a JavaScript project"**
Accept all defaults (yes to .gitignore, yes to install sample project deps if prompted).

Then delete any sample contracts and tests that Hardhat generated:

```bash
rm -f contracts/Lock.sol
rm -f test/Lock.js
rm -rf ignition/
```

---

## STEP 2: Create directory structure

Create all directories the project needs:

```bash
mkdir -p contracts
mkdir -p test
mkdir -p scripts
mkdir -p scraper/adapters
mkdir -p scraper/state
mkdir -p scraper/utils
mkdir -p cli
mkdir -p config
mkdir -p data
mkdir -p docs
```

---

## STEP 3: Create hardhat.config.js

**Delete** the auto-generated `hardhat.config.js` and create this exact file:

**File: `hardhat.config.js`**

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
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

**Key points:**
- Solidity 0.8.24 with optimizer ON (200 runs).
- Two networks: `base-sepolia` (testnet) and `base-mainnet`.
- Accounts array is empty if PRIVATE_KEY not set — this prevents crashes during local testing.
- Etherscan config uses customChains because Base is not a default Hardhat network.

---

## STEP 4: Create environment files

**File: `.env.example`** (committed to repo — template for contributors)

```
# SaThuCoin Environment Configuration
# Copy this file to .env and fill in your values
# NEVER commit the .env file

# Deployer wallet private key (without 0x prefix works too, but include it for clarity)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# RPC URLs
RPC_URL=https://sepolia.base.org
RPC_URL_MAINNET=https://mainnet.base.org

# BaseScan API key for contract verification (get from basescan.org)
BASESCAN_API_KEY=YOUR_BASESCAN_API_KEY_HERE

# Deployed contract address (filled after deployment)
CONTRACT_ADDRESS=

# Scraper settings
SCRAPE_INTERVAL=0 */6 * * *
```

**File: `.env`** (NOT committed — copy of .env.example with real values for local dev)

Create this with dummy values for now:

```
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
RPC_URL=https://sepolia.base.org
RPC_URL_MAINNET=https://mainnet.base.org
BASESCAN_API_KEY=
CONTRACT_ADDRESS=
SCRAPE_INTERVAL=0 */6 * * *
```

Note: The PRIVATE_KEY above is Hardhat's default Account #0 private key — safe for local testing only.

---

## STEP 5: Create .gitignore

**File: `.gitignore`**

```
# Dependencies
node_modules/

# Hardhat
artifacts/
cache/
typechain-types/
coverage/
coverage.json

# Environment
.env

# Data (runtime state, logs)
data/*.json
scraper/state/seen-wallets.json

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Misc
*.log
```

---

## STEP 6: Create the smart contract

**File: `contracts/SaThuCoin.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SaThuCoin (SATHU)
/// @author SaThuCoin Contributors
/// @notice A fictional ERC-20 token that rewards charitable donors.
/// @dev Uncapped supply. All tokens are minted by the owner in response to verified good deeds.
///      No initial supply — every SATHU in existence represents a verified donation.
contract SaThuCoin is ERC20, Ownable {

    /// @notice Emitted when tokens are minted for a verified good deed.
    /// @param recipient The wallet that receives the SATHU tokens.
    /// @param amount The number of tokens minted (in wei, 18 decimals).
    /// @param deed A short description of the deed or the source name.
    event DeedRewarded(
        address indexed recipient,
        uint256 amount,
        string deed
    );

    /// @notice Deploys SaThuCoin with zero initial supply.
    /// @dev Owner is set to msg.sender via OZ Ownable(msg.sender).
    constructor() ERC20("SaThuCoin", "SATHU") Ownable(msg.sender) {
        // No initial mint — supply starts at 0
    }

    /// @notice Mint tokens to an address. Only callable by the owner.
    /// @param to The recipient address.
    /// @param amount The number of tokens to mint (in wei, 18 decimals).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Mint tokens for a verified good deed. Emits DeedRewarded event.
    /// @param to The recipient address (the donor's wallet).
    /// @param amount The number of tokens to mint (in wei, 18 decimals).
    /// @param deed A short description of the deed or the source name.
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

**Design decisions explained:**
- `constructor()` takes no arguments — owner is always msg.sender. Simpler for a solo dev project.
- `mint()` is a plain mint without event — useful for batch operations or manual mints.
- `mintForDeed()` mints AND emits a `DeedRewarded` event — this is the primary function the scraper calls. The `deed` string records which source triggered the mint, creating an on-chain audit trail.
- `string calldata deed` uses `calldata` not `memory` — saves gas since we only read it, never modify it.
- No cap, no pausable, no burnable — keep it minimal for MVP.
- No custom errors beyond what OZ provides — the contract is too simple to need them.

---

## STEP 7: Compile and verify

Run compilation:

```bash
npx hardhat compile
```

**Expected output:**
```
Compiled 1 Solidity file successfully (evm target: paris).
```

If you see warnings about SPDX or pragma, that's fine. Errors mean something is wrong — fix before proceeding.

---

## STEP 8: Create comprehensive tests

**File: `test/SaThuCoin.test.js`**

```javascript
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SaThuCoin", function () {

  // Fixture: deploys a fresh contract for each test
  async function deployFixture() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();
    const SaThuCoin = await ethers.getContractFactory("SaThuCoin");
    const token = await SaThuCoin.deploy();
    await token.waitForDeployment();
    return { token, owner, alice, bob, charlie };
  }

  // ──────────────────────────────────────────
  // DEPLOYMENT
  // ──────────────────────────────────────────

  describe("Deployment", function () {

    it("should have correct name", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("SaThuCoin");
    });

    it("should have correct symbol", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.symbol()).to.equal("SATHU");
    });

    it("should have 18 decimals", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.decimals()).to.equal(18n);
    });

    it("should have zero initial supply", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.totalSupply()).to.equal(0n);
    });

    it("should set deployer as owner", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("should have zero balance for owner", async function () {
      const { token, owner } = await loadFixture(deployFixture);
      expect(await token.balanceOf(owner.address)).to.equal(0n);
    });
  });

  // ──────────────────────────────────────────
  // MINTING (mint function)
  // ──────────────────────────────────────────

  describe("Minting — mint()", function () {

    it("should allow owner to mint tokens to any address", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await token.mint(alice.address, amount);

      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("should increase total supply on mint", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await token.mint(alice.address, amount);

      expect(await token.totalSupply()).to.equal(amount);
    });

    it("should emit Transfer event from zero address", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await expect(token.mint(alice.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, alice.address, amount);
    });

    it("should revert when non-owner tries to mint", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await expect(
        token.connect(alice).mint(bob.address, amount)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("should allow minting to multiple addresses", async function () {
      const { token, alice, bob, charlie } = await loadFixture(deployFixture);

      await token.mint(alice.address, ethers.parseEther("10"));
      await token.mint(bob.address, ethers.parseEther("50"));
      await token.mint(charlie.address, ethers.parseEther("200"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("10"));
      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("50"));
      expect(await token.balanceOf(charlie.address)).to.equal(ethers.parseEther("200"));
      expect(await token.totalSupply()).to.equal(ethers.parseEther("260"));
    });

    it("should allow multiple mints to the same address", async function () {
      const { token, alice } = await loadFixture(deployFixture);

      await token.mint(alice.address, ethers.parseEther("10"));
      await token.mint(alice.address, ethers.parseEther("20"));
      await token.mint(alice.address, ethers.parseEther("30"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("60"));
    });

    it("should allow minting zero tokens (no-op)", async function () {
      const { token, alice } = await loadFixture(deployFixture);

      await token.mint(alice.address, 0n);

      expect(await token.balanceOf(alice.address)).to.equal(0n);
      expect(await token.totalSupply()).to.equal(0n);
    });
  });

  // ──────────────────────────────────────────
  // MINTING FOR DEED (mintForDeed function)
  // ──────────────────────────────────────────

  describe("Minting — mintForDeed()", function () {

    it("should mint tokens and emit DeedRewarded event", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("50");
      const deed = "Charity Alpha Foundation";

      await expect(token.mintForDeed(alice.address, amount, deed))
        .to.emit(token, "DeedRewarded")
        .withArgs(alice.address, amount, deed);

      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("should also emit Transfer event from zero address", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("50");

      await expect(token.mintForDeed(alice.address, amount, "Test deed"))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, alice.address, amount);
    });

    it("should handle empty deed string", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10");

      await expect(token.mintForDeed(alice.address, amount, ""))
        .to.emit(token, "DeedRewarded")
        .withArgs(alice.address, amount, "");
    });

    it("should handle long deed string", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10");
      const longDeed = "A".repeat(500);

      await expect(token.mintForDeed(alice.address, amount, longDeed))
        .to.emit(token, "DeedRewarded")
        .withArgs(alice.address, amount, longDeed);
    });

    it("should handle unicode deed string", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10");
      const deed = "捐赠给慈善机构 🎉";

      await expect(token.mintForDeed(alice.address, amount, deed))
        .to.emit(token, "DeedRewarded")
        .withArgs(alice.address, amount, deed);
    });

    it("should revert when non-owner tries to mintForDeed", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);

      await expect(
        token.connect(alice).mintForDeed(bob.address, ethers.parseEther("10"), "Hack attempt")
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });

    it("should increase total supply correctly", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);

      await token.mintForDeed(alice.address, ethers.parseEther("50"), "Deed A");
      await token.mintForDeed(bob.address, ethers.parseEther("100"), "Deed B");

      expect(await token.totalSupply()).to.equal(ethers.parseEther("150"));
    });
  });

  // ──────────────────────────────────────────
  // TRANSFERS
  // ──────────────────────────────────────────

  describe("Transfers", function () {

    it("should allow token holders to transfer", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);

      // Mint to alice
      await token.mint(alice.address, ethers.parseEther("100"));

      // Alice transfers to bob
      await token.connect(alice).transfer(bob.address, ethers.parseEther("30"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("70"));
      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("30"));
    });

    it("should use changeTokenBalances matcher", async function () {
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

    it("should revert on insufficient balance", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);

      // Alice has 0 tokens
      await expect(
        token.connect(alice).transfer(bob.address, 1n)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });

    it("should not change total supply on transfer", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);
      await token.mint(alice.address, ethers.parseEther("100"));

      const supplyBefore = await token.totalSupply();
      await token.connect(alice).transfer(bob.address, ethers.parseEther("50"));
      const supplyAfter = await token.totalSupply();

      expect(supplyAfter).to.equal(supplyBefore);
    });
  });

  // ──────────────────────────────────────────
  // APPROVALS
  // ──────────────────────────────────────────

  describe("Approvals", function () {

    it("should allow approve and transferFrom", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);
      await token.mint(alice.address, ethers.parseEther("100"));

      // Alice approves bob to spend 50
      await token.connect(alice).approve(bob.address, ethers.parseEther("50"));
      expect(await token.allowance(alice.address, bob.address)).to.equal(ethers.parseEther("50"));

      // Bob transfers 30 from alice to himself
      await token.connect(bob).transferFrom(alice.address, bob.address, ethers.parseEther("30"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("70"));
      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("30"));
      expect(await token.allowance(alice.address, bob.address)).to.equal(ethers.parseEther("20"));
    });

    it("should revert transferFrom exceeding allowance", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);
      await token.mint(alice.address, ethers.parseEther("100"));
      await token.connect(alice).approve(bob.address, ethers.parseEther("10"));

      await expect(
        token.connect(bob).transferFrom(alice.address, bob.address, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
    });
  });

  // ──────────────────────────────────────────
  // OWNERSHIP
  // ──────────────────────────────────────────

  describe("Ownership", function () {

    it("should allow owner to transfer ownership", async function () {
      const { token, owner, alice } = await loadFixture(deployFixture);

      await token.transferOwnership(alice.address);

      expect(await token.owner()).to.equal(alice.address);
    });

    it("should allow new owner to mint", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);

      await token.transferOwnership(alice.address);
      await token.connect(alice).mint(bob.address, ethers.parseEther("100"));

      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("100"));
    });

    it("should prevent old owner from minting after transfer", async function () {
      const { token, owner, alice, bob } = await loadFixture(deployFixture);

      await token.transferOwnership(alice.address);

      await expect(
        token.mint(bob.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(owner.address);
    });

    it("should allow owner to renounce ownership", async function () {
      const { token, owner } = await loadFixture(deployFixture);

      await token.renounceOwnership();

      expect(await token.owner()).to.equal(ethers.ZeroAddress);
    });

    it("should prevent minting after renouncing ownership", async function () {
      const { token, owner, alice } = await loadFixture(deployFixture);

      await token.renounceOwnership();

      await expect(
        token.mint(alice.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("should prevent non-owner from transferring ownership", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);

      await expect(
        token.connect(alice).transferOwnership(bob.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount")
        .withArgs(alice.address);
    });
  });

  // ──────────────────────────────────────────
  // SUPPLY TRACKING
  // ──────────────────────────────────────────

  describe("Supply tracking", function () {

    it("should track supply across many mints", async function () {
      const { token, alice, bob, charlie } = await loadFixture(deployFixture);

      await token.mint(alice.address, ethers.parseEther("100"));
      await token.mintForDeed(bob.address, ethers.parseEther("200"), "Deed B");
      await token.mint(charlie.address, ethers.parseEther("300"));

      expect(await token.totalSupply()).to.equal(ethers.parseEther("600"));

      // Transfers don't affect supply
      await token.connect(alice).transfer(bob.address, ethers.parseEther("50"));

      expect(await token.totalSupply()).to.equal(ethers.parseEther("600"));
    });

    it("should handle very large mint amounts", async function () {
      const { token, alice } = await loadFixture(deployFixture);

      // Mint 1 billion tokens
      const billion = ethers.parseEther("1000000000");
      await token.mint(alice.address, billion);

      expect(await token.balanceOf(alice.address)).to.equal(billion);
      expect(await token.totalSupply()).to.equal(billion);
    });
  });
});
```

**Test design notes:**
- Uses `loadFixture(deployFixture)` for snapshot-based isolation — fastest Hardhat test pattern.
- Every test is independent — no shared state between tests.
- Tests cover: deployment, mint, mintForDeed, transfers, approvals, ownership, supply tracking.
- Uses ethers v6 syntax throughout (`0n`, `ethers.parseEther()`, `ethers.ZeroAddress`, `BigInt`).
- Uses OZ v5 custom error matchers (`.revertedWithCustomError`), NOT string matchers.
- Tests edge cases: zero amounts, empty strings, unicode, very large values.

---

## STEP 9: Run tests

```bash
npx hardhat test
```

**Expected output:**

```
  SaThuCoin
    Deployment
      ✔ should have correct name
      ✔ should have correct symbol
      ✔ should have 18 decimals
      ✔ should have zero initial supply
      ✔ should set deployer as owner
      ✔ should have zero balance for owner
    Minting — mint()
      ✔ should allow owner to mint tokens to any address
      ✔ should increase total supply on mint
      ✔ should emit Transfer event from zero address
      ✔ should revert when non-owner tries to mint
      ✔ should allow minting to multiple addresses
      ✔ should allow multiple mints to the same address
      ✔ should allow minting zero tokens (no-op)
    Minting — mintForDeed()
      ✔ should mint tokens and emit DeedRewarded event
      ✔ should also emit Transfer event from zero address
      ✔ should handle empty deed string
      ✔ should handle long deed string
      ✔ should handle unicode deed string
      ✔ should revert when non-owner tries to mintForDeed
      ✔ should increase total supply correctly
    Transfers
      ✔ should allow token holders to transfer
      ✔ should use changeTokenBalances matcher
      ✔ should revert on insufficient balance
      ✔ should not change total supply on transfer
    Approvals
      ✔ should allow approve and transferFrom
      ✔ should revert transferFrom exceeding allowance
    Ownership
      ✔ should allow owner to transfer ownership
      ✔ should allow new owner to mint
      ✔ should prevent old owner from minting after transfer
      ✔ should allow owner to renounce ownership
      ✔ should prevent minting after renouncing ownership
      ✔ should prevent non-owner from transferring ownership
    Supply tracking
      ✔ should track supply across many mints
      ✔ should handle very large mint amounts

  33 passing
```

**ALL 33 tests must pass before proceeding.** If any fail, fix and re-run.

You can also run with gas reporting:

```bash
REPORT_GAS=true npx hardhat test
```

---

## STEP 10: Create deployment script

**File: `scripts/deploy.js`**

```javascript
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = (await hre.ethers.provider.getNetwork()).chainId;

  console.log("═══════════════════════════════════════════");
  console.log("  SaThuCoin Deployment");
  console.log("═══════════════════════════════════════════");
  console.log(`  Network:  ${network}`);
  console.log(`  Chain ID: ${chainId}`);
  console.log(`  Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`  Balance:  ${hre.ethers.formatEther(balance)} ETH`);
  console.log("═══════════════════════════════════════════");

  if (balance === 0n) {
    console.error("\n❌ Deployer has zero balance. Fund the wallet first.");
    process.exit(1);
  }

  // Deploy
  console.log("\n⏳ Deploying SaThuCoin...");
  const SaThuCoin = await hre.ethers.getContractFactory("SaThuCoin");
  const token = await SaThuCoin.deploy();
  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  const deployTx = token.deploymentTransaction();

  console.log(`\n✅ SaThuCoin deployed!`);
  console.log(`   Address: ${contractAddress}`);
  console.log(`   Tx Hash: ${deployTx.hash}`);

  // Verify initial state
  const name = await token.name();
  const symbol = await token.symbol();
  const totalSupply = await token.totalSupply();
  const owner = await token.owner();

  console.log(`\n📋 Contract State:`);
  console.log(`   Name:         ${name}`);
  console.log(`   Symbol:       ${symbol}`);
  console.log(`   Total Supply: ${hre.ethers.formatEther(totalSupply)} ${symbol}`);
  console.log(`   Owner:        ${owner}`);

  // Save deployment info
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const deploymentInfo = {
    network: network,
    chainId: chainId.toString(),
    contractAddress: contractAddress,
    deployer: deployer.address,
    txHash: deployTx.hash,
    timestamp: new Date().toISOString(),
    blockNumber: deployTx.blockNumber,
    solidity: "0.8.24",
    optimizer: { enabled: true, runs: 200 },
  };

  const deploymentFile = path.join(dataDir, "deployment.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: data/deployment.json`);

  // Verification reminder
  if (network !== "hardhat" && network !== "localhost") {
    console.log(`\n🔍 To verify on BaseScan, wait ~60 seconds then run:`);
    console.log(`   npx hardhat verify --network ${network} ${contractAddress}`);
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("  Deployment complete!");
  console.log("═══════════════════════════════════════════\n");
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:", error.message);
  process.exitCode = 1;
});
```

**File: `scripts/verify.js`**

```javascript
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentFile = path.join(__dirname, "..", "data", "deployment.json");

  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ No deployment.json found. Deploy first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const contractAddress = deployment.contractAddress;
  const network = hre.network.name;

  console.log(`\n🔍 Verifying SaThuCoin on ${network}...`);
  console.log(`   Address: ${contractAddress}`);

  try {
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("\n✅ Contract verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified") || error.message.includes("already verified")) {
      console.log("\n✅ Contract is already verified.");
    } else {
      console.error("\n❌ Verification failed:", error.message);
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exitCode = 1;
});
```

---

## STEP 11: Create initial config files

**File: `config/sources.json`**

```json
[
  {
    "id": "example-charity",
    "name": "Example Charity Foundation",
    "url": "https://example.com/donors",
    "type": "html",
    "selector": ".donor-wallet",
    "attribute": "text",
    "rewardAmount": "50",
    "enabled": false,
    "notes": "EXAMPLE — replace with a real source. Disabled by default."
  },
  {
    "id": "example-api",
    "name": "Example NGO API",
    "url": "https://api.example.com/v1/public-donors",
    "type": "api",
    "walletField": "data.donors[].walletAddress",
    "rewardAmount": "100",
    "enabled": false,
    "notes": "EXAMPLE — replace with a real source. Disabled by default."
  }
]
```

**File: `config/rewards.json`**

```json
{
  "defaultReward": "10",
  "decimals": 18,
  "dryRun": false,
  "maxMintsPerCycle": 50,
  "cooldownMinutes": 5
}
```

---

## STEP 12: Update package.json scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "compile": "npx hardhat compile",
    "test": "npx hardhat test",
    "test:gas": "REPORT_GAS=true npx hardhat test",
    "deploy:testnet": "npx hardhat run scripts/deploy.js --network base-sepolia",
    "deploy:mainnet": "npx hardhat run scripts/deploy.js --network base-mainnet",
    "verify:testnet": "npx hardhat run scripts/verify.js --network base-sepolia",
    "verify:mainnet": "npx hardhat run scripts/verify.js --network base-mainnet",
    "clean": "npx hardhat clean"
  }
}
```

---

## STEP 13: Verify everything works

Run this sequence. ALL must succeed:

```bash
# 1. Clean build
npx hardhat clean
npx hardhat compile

# 2. All tests pass
npx hardhat test

# 3. Gas report (informational)
REPORT_GAS=true npx hardhat test
```

---

## STEP 14: Create initial commit

```bash
git init
git add .
git commit -m "phase-1: project bootstrap, SaThuCoin contract, tests, deploy scripts"
```

---

## FINAL CHECKLIST

Before this phase is considered DONE, verify:

- [ ] `npx hardhat compile` succeeds with zero errors
- [ ] `npx hardhat test` passes ALL 33 tests
- [ ] `contracts/SaThuCoin.sol` exists with correct code
- [ ] `test/SaThuCoin.test.js` exists with comprehensive tests
- [ ] `scripts/deploy.js` exists
- [ ] `scripts/verify.js` exists
- [ ] `hardhat.config.js` has Base Sepolia + Base Mainnet networks
- [ ] `.env.example` exists (committed)
- [ ] `.env` exists (NOT committed, in .gitignore)
- [ ] `.gitignore` covers all sensitive/generated files
- [ ] `config/sources.json` and `config/rewards.json` exist
- [ ] All directories created: contracts, test, scripts, scraper, cli, config, data, docs
- [ ] `package.json` has all npm scripts
- [ ] Initial git commit made

---

## WHAT COMES NEXT

Phase 2 will build the scraper engine — the system that fetches public charity websites, extracts donor wallet addresses, and identifies new donors to reward with SATHU. But that's a separate instruction.

**Do not proceed to Phase 2 until this entire checklist is green.**
