const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("SaThuCoin", function () {

  // Role constants matching the contract
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  // Constants matching the contract
  const MAX_MINT_PER_TX = ethers.parseEther("10000");
  const MAX_DAILY_MINT = ethers.parseEther("500000");
  const SUPPLY_CAP = ethers.parseEther("1000000000"); // 1 billion
  const ONE_DAY = 86400; // seconds in a day

  // Fixture: deploys a fresh contract for each test
  // admin = owner (gets DEFAULT_ADMIN_ROLE + PAUSER_ROLE)
  // minter = separate account (gets MINTER_ROLE)
  async function deployFixture() {
    const [admin, minter, alice, bob, charlie] = await ethers.getSigners();
    const SaThuCoin = await ethers.getContractFactory("SaThuCoin");
    const token = await SaThuCoin.deploy(admin.address, minter.address);
    await token.waitForDeployment();
    return { token, admin, minter, alice, bob, charlie };
  }

  // Alternative fixture: admin is also the minter (simpler for some tests)
  async function deploySingleRoleFixture() {
    const [admin, alice, bob, charlie] = await ethers.getSigners();
    const SaThuCoin = await ethers.getContractFactory("SaThuCoin");
    const token = await SaThuCoin.deploy(admin.address, admin.address);
    await token.waitForDeployment();
    return { token, admin, alice, bob, charlie };
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

    it("should grant DEFAULT_ADMIN_ROLE to admin", async function () {
      const { token, admin } = await loadFixture(deployFixture);
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(true);
    });

    it("should grant MINTER_ROLE to minter", async function () {
      const { token, minter } = await loadFixture(deployFixture);
      expect(await token.hasRole(MINTER_ROLE, minter.address)).to.equal(true);
    });

    it("should grant PAUSER_ROLE to admin", async function () {
      const { token, admin } = await loadFixture(deployFixture);
      expect(await token.hasRole(PAUSER_ROLE, admin.address)).to.equal(true);
    });

    it("should not grant MINTER_ROLE to admin (when different from minter)", async function () {
      const { token, admin } = await loadFixture(deployFixture);
      expect(await token.hasRole(MINTER_ROLE, admin.address)).to.equal(false);
    });

    it("should not grant DEFAULT_ADMIN_ROLE to minter (when different from admin)", async function () {
      const { token, minter } = await loadFixture(deployFixture);
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, minter.address)).to.equal(false);
    });

    it("should have zero balance for all accounts", async function () {
      const { token, admin, minter } = await loadFixture(deployFixture);
      expect(await token.balanceOf(admin.address)).to.equal(0n);
      expect(await token.balanceOf(minter.address)).to.equal(0n);
    });

    it("should have correct supply cap", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.cap()).to.equal(SUPPLY_CAP);
    });

    it("should have correct MAX_MINT_PER_TX", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.MAX_MINT_PER_TX()).to.equal(MAX_MINT_PER_TX);
    });

    it("should not be paused initially", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.paused()).to.equal(false);
    });

    it("should support AccessControl interface", async function () {
      const { token } = await loadFixture(deployFixture);
      // IAccessControl interface ID
      expect(await token.supportsInterface("0x7965db0b")).to.equal(true);
    });

    it("should revert when admin is zero address", async function () {
      const [, minter] = await ethers.getSigners();
      const SaThuCoin = await ethers.getContractFactory("SaThuCoin");
      await expect(
        SaThuCoin.deploy(ethers.ZeroAddress, minter.address)
      ).to.be.revertedWithCustomError(SaThuCoin, "ZeroAddressNotAllowed");
    });

    it("should revert when minter is zero address", async function () {
      const [admin] = await ethers.getSigners();
      const SaThuCoin = await ethers.getContractFactory("SaThuCoin");
      await expect(
        SaThuCoin.deploy(admin.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(SaThuCoin, "ZeroAddressNotAllowed");
    });

    it("should revert when both admin and minter are zero address", async function () {
      const SaThuCoin = await ethers.getContractFactory("SaThuCoin");
      await expect(
        SaThuCoin.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(SaThuCoin, "ZeroAddressNotAllowed");
    });
  });

  // ──────────────────────────────────────────
  // MINTING (mint function)
  // ──────────────────────────────────────────

  describe("Minting — mint()", function () {

    it("should allow minter to mint tokens to any address", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await token.connect(minter).mint(alice.address, amount);

      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("should increase total supply on mint", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await token.connect(minter).mint(alice.address, amount);

      expect(await token.totalSupply()).to.equal(amount);
    });

    it("should emit Transfer event from zero address", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await expect(token.connect(minter).mint(alice.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, alice.address, amount);
    });

    it("should revert when non-minter tries to mint", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");

      await expect(
        token.connect(alice).mint(bob.address, amount)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, MINTER_ROLE);
    });

    it("should revert when admin (without MINTER_ROLE) tries to mint", async function () {
      const { token, admin, alice } = await loadFixture(deployFixture);

      await expect(
        token.connect(admin).mint(alice.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(admin.address, MINTER_ROLE);
    });

    it("should allow minting to multiple addresses", async function () {
      const { token, minter, alice, bob, charlie } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, ethers.parseEther("10"));
      await token.connect(minter).mint(bob.address, ethers.parseEther("50"));
      await token.connect(minter).mint(charlie.address, ethers.parseEther("200"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("10"));
      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("50"));
      expect(await token.balanceOf(charlie.address)).to.equal(ethers.parseEther("200"));
      expect(await token.totalSupply()).to.equal(ethers.parseEther("260"));
    });

    it("should allow multiple mints to the same address", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, ethers.parseEther("10"));
      await token.connect(minter).mint(alice.address, ethers.parseEther("20"));
      await token.connect(minter).mint(alice.address, ethers.parseEther("30"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("60"));
    });

    it("should allow minting zero tokens (no-op)", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, 0n);

      expect(await token.balanceOf(alice.address)).to.equal(0n);
      expect(await token.totalSupply()).to.equal(0n);
    });

    it("should revert when minting to zero address", async function () {
      const { token, minter } = await loadFixture(deployFixture);

      await expect(
        token.connect(minter).mint(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
        .withArgs(ethers.ZeroAddress);
    });
  });

  // ──────────────────────────────────────────
  // MINTING FOR DEED (mintForDeed function)
  // ──────────────────────────────────────────

  describe("Minting — mintForDeed()", function () {

    it("should mint tokens and emit DeedRewarded event", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("50");
      const deed = "Charity Alpha Foundation";

      await expect(token.connect(minter).mintForDeed(alice.address, amount, deed))
        .to.emit(token, "DeedRewarded")
        .withArgs(alice.address, amount, deed);

      expect(await token.balanceOf(alice.address)).to.equal(amount);
    });

    it("should also emit Transfer event from zero address", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("50");

      await expect(token.connect(minter).mintForDeed(alice.address, amount, "Test deed"))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, alice.address, amount);
    });

    it("should handle empty deed string", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10");

      await expect(token.connect(minter).mintForDeed(alice.address, amount, ""))
        .to.emit(token, "DeedRewarded")
        .withArgs(alice.address, amount, "");
    });

    it("should handle long deed string", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10");
      const longDeed = "A".repeat(500);

      await expect(token.connect(minter).mintForDeed(alice.address, amount, longDeed))
        .to.emit(token, "DeedRewarded")
        .withArgs(alice.address, amount, longDeed);
    });

    it("should handle unicode deed string", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("10");
      const deed = "Donated to charity";

      await expect(token.connect(minter).mintForDeed(alice.address, amount, deed))
        .to.emit(token, "DeedRewarded")
        .withArgs(alice.address, amount, deed);
    });

    it("should revert when non-minter tries to mintForDeed", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);

      await expect(
        token.connect(alice).mintForDeed(bob.address, ethers.parseEther("10"), "Hack attempt")
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, MINTER_ROLE);
    });

    it("should revert when admin (without MINTER_ROLE) tries to mintForDeed", async function () {
      const { token, admin, alice } = await loadFixture(deployFixture);

      await expect(
        token.connect(admin).mintForDeed(alice.address, ethers.parseEther("10"), "Admin deed")
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(admin.address, MINTER_ROLE);
    });

    it("should increase total supply correctly", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);

      await token.connect(minter).mintForDeed(alice.address, ethers.parseEther("50"), "Deed A");
      await token.connect(minter).mintForDeed(bob.address, ethers.parseEther("100"), "Deed B");

      expect(await token.totalSupply()).to.equal(ethers.parseEther("150"));
    });

    it("should revert when minting to zero address via mintForDeed", async function () {
      const { token, minter } = await loadFixture(deployFixture);

      await expect(
        token.connect(minter).mintForDeed(ethers.ZeroAddress, ethers.parseEther("10"), "Bad deed")
      ).to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
        .withArgs(ethers.ZeroAddress);
    });
  });

  // ──────────────────────────────────────────
  // PER-TRANSACTION MINT LIMIT
  // ──────────────────────────────────────────

  describe("Per-transaction mint limit", function () {

    it("should allow minting exactly MAX_MINT_PER_TX", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);

      expect(await token.balanceOf(alice.address)).to.equal(MAX_MINT_PER_TX);
    });

    it("should revert when minting above MAX_MINT_PER_TX via mint()", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const tooMuch = MAX_MINT_PER_TX + 1n;

      await expect(
        token.connect(minter).mint(alice.address, tooMuch)
      ).to.be.revertedWithCustomError(token, "MintAmountExceedsLimit")
        .withArgs(tooMuch, MAX_MINT_PER_TX);
    });

    it("should revert when minting above MAX_MINT_PER_TX via mintForDeed()", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const tooMuch = MAX_MINT_PER_TX + 1n;

      await expect(
        token.connect(minter).mintForDeed(alice.address, tooMuch, "Too much")
      ).to.be.revertedWithCustomError(token, "MintAmountExceedsLimit")
        .withArgs(tooMuch, MAX_MINT_PER_TX);
    });

    it("should allow multiple mints each under the limit", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);
      await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);
      await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);

      expect(await token.balanceOf(alice.address)).to.equal(MAX_MINT_PER_TX * 3n);
    });
  });

  // ──────────────────────────────────────────
  // SUPPLY CAP
  // ──────────────────────────────────────────

  describe("Supply cap", function () {

    it("should return correct cap value", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.cap()).to.equal(SUPPLY_CAP);
    });

    it("should maintain cap value after minting", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);
      expect(await token.cap()).to.equal(SUPPLY_CAP);
    });

    it("should revert when mint would exceed cap", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const contractAddress = await token.getAddress();

      // Set totalSupply to cap - 1 SATHU via storage manipulation
      // In OZ v5 ERC20, _totalSupply is at storage slot 2
      const almostCap = SUPPLY_CAP - ethers.parseEther("1");
      const slot = ethers.toBeHex(2, 32);
      const value = ethers.zeroPadValue(ethers.toBeHex(almostCap), 32);
      await network.provider.send("hardhat_setStorageAt", [contractAddress, slot, value]);

      expect(await token.totalSupply()).to.equal(almostCap);

      // Minting exactly 1 SATHU should succeed (reaches cap exactly)
      await token.connect(minter).mint(alice.address, ethers.parseEther("1"));
      expect(await token.totalSupply()).to.equal(SUPPLY_CAP);

      // Minting 1 more wei should revert with ERC20ExceededCap
      await expect(
        token.connect(minter).mint(alice.address, 1n)
      ).to.be.revertedWithCustomError(token, "ERC20ExceededCap");
    });

    it("should track remaining mintable supply", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, ethers.parseEther("5000"));

      const remaining = SUPPLY_CAP - await token.totalSupply();
      expect(remaining).to.equal(SUPPLY_CAP - ethers.parseEther("5000"));
    });

    it("should allow reminting after burn (burned tokens free cap space)", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const contractAddress = await token.getAddress();

      // Set totalSupply near cap via storage manipulation
      const nearCap = SUPPLY_CAP - ethers.parseEther("100");
      const slot = ethers.toBeHex(2, 32);
      const value = ethers.zeroPadValue(ethers.toBeHex(nearCap), 32);
      await network.provider.send("hardhat_setStorageAt", [contractAddress, slot, value]);

      // Also give alice those tokens so she can burn them
      const aliceBalSlot = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [alice.address, 0])
      );
      await network.provider.send("hardhat_setStorageAt", [contractAddress, aliceBalSlot, value]);

      // Mint exactly 100 to reach cap
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      expect(await token.totalSupply()).to.equal(SUPPLY_CAP);

      // Cannot mint more
      await expect(
        token.connect(minter).mint(alice.address, 1n)
      ).to.be.revertedWithCustomError(token, "ERC20ExceededCap");

      // Burn 50 tokens
      await token.connect(alice).burn(ethers.parseEther("50"));

      // Now can mint again (up to 50)
      await token.connect(minter).mint(alice.address, ethers.parseEther("50"));
      expect(await token.totalSupply()).to.equal(SUPPLY_CAP);
    });
  });

  // ──────────────────────────────────────────
  // PAUSING
  // ──────────────────────────────────────────

  describe("Pausing", function () {

    it("should allow pauser to pause", async function () {
      const { token, admin } = await loadFixture(deployFixture);

      await token.connect(admin).pause();

      expect(await token.paused()).to.equal(true);
    });

    it("should allow pauser to unpause", async function () {
      const { token, admin } = await loadFixture(deployFixture);

      await token.connect(admin).pause();
      await token.connect(admin).unpause();

      expect(await token.paused()).to.equal(false);
    });

    it("should emit Paused event", async function () {
      const { token, admin } = await loadFixture(deployFixture);

      await expect(token.connect(admin).pause())
        .to.emit(token, "Paused")
        .withArgs(admin.address);
    });

    it("should emit Unpaused event", async function () {
      const { token, admin } = await loadFixture(deployFixture);

      await token.connect(admin).pause();

      await expect(token.connect(admin).unpause())
        .to.emit(token, "Unpaused")
        .withArgs(admin.address);
    });

    it("should revert when non-pauser tries to pause", async function () {
      const { token, alice } = await loadFixture(deployFixture);

      await expect(
        token.connect(alice).pause()
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, PAUSER_ROLE);
    });

    it("should revert when minter (without PAUSER_ROLE) tries to pause", async function () {
      const { token, minter } = await loadFixture(deployFixture);

      await expect(
        token.connect(minter).pause()
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(minter.address, PAUSER_ROLE);
    });

    it("should revert when non-pauser tries to unpause", async function () {
      const { token, admin, alice } = await loadFixture(deployFixture);

      await token.connect(admin).pause();

      await expect(
        token.connect(alice).unpause()
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, PAUSER_ROLE);
    });

    it("should revert mint() when paused", async function () {
      const { token, admin, minter, alice } = await loadFixture(deployFixture);

      await token.connect(admin).pause();

      await expect(
        token.connect(minter).mint(alice.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("should revert mintForDeed() when paused", async function () {
      const { token, admin, minter, alice } = await loadFixture(deployFixture);

      await token.connect(admin).pause();

      await expect(
        token.connect(minter).mintForDeed(alice.address, ethers.parseEther("100"), "Test")
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("should revert transfers when paused", async function () {
      const { token, admin, minter, alice, bob } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await token.connect(admin).pause();

      await expect(
        token.connect(alice).transfer(bob.address, ethers.parseEther("10"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("should revert transferFrom when paused", async function () {
      const { token, admin, minter, alice, bob } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await token.connect(alice).approve(bob.address, ethers.parseEther("50"));
      await token.connect(admin).pause();

      await expect(
        token.connect(bob).transferFrom(alice.address, bob.address, ethers.parseEther("10"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("should resume transfers after unpause", async function () {
      const { token, admin, minter, alice, bob } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await token.connect(admin).pause();
      await token.connect(admin).unpause();

      await token.connect(alice).transfer(bob.address, ethers.parseEther("10"));

      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("10"));
    });

    it("should resume minting after unpause", async function () {
      const { token, admin, minter, alice } = await loadFixture(deployFixture);

      await token.connect(admin).pause();
      await token.connect(admin).unpause();

      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));
    });
  });

  // ──────────────────────────────────────────
  // TRANSFERS
  // ──────────────────────────────────────────

  describe("Transfers", function () {

    it("should allow token holders to transfer", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await token.connect(alice).transfer(bob.address, ethers.parseEther("30"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("70"));
      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("30"));
    });

    it("should use changeTokenBalances matcher", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

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

      await expect(
        token.connect(alice).transfer(bob.address, 1n)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });

    it("should not change total supply on transfer", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      const supplyBefore = await token.totalSupply();
      await token.connect(alice).transfer(bob.address, ethers.parseEther("50"));
      const supplyAfter = await token.totalSupply();

      expect(supplyAfter).to.equal(supplyBefore);
    });

    it("should allow transfer to self", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      await token.connect(alice).transfer(alice.address, ethers.parseEther("50"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));
    });
  });

  // ──────────────────────────────────────────
  // APPROVALS
  // ──────────────────────────────────────────

  describe("Approvals", function () {

    it("should allow approve and transferFrom", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      await token.connect(alice).approve(bob.address, ethers.parseEther("50"));
      expect(await token.allowance(alice.address, bob.address)).to.equal(ethers.parseEther("50"));

      await token.connect(bob).transferFrom(alice.address, bob.address, ethers.parseEther("30"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("70"));
      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("30"));
      expect(await token.allowance(alice.address, bob.address)).to.equal(ethers.parseEther("20"));
    });

    it("should revert transferFrom exceeding allowance", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await token.connect(alice).approve(bob.address, ethers.parseEther("10"));

      await expect(
        token.connect(bob).transferFrom(alice.address, bob.address, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
    });

    it("should emit Approval event", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      await expect(token.connect(alice).approve(bob.address, ethers.parseEther("50")))
        .to.emit(token, "Approval")
        .withArgs(alice.address, bob.address, ethers.parseEther("50"));
    });

    it("should allow approval overwrite", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      await token.connect(alice).approve(bob.address, ethers.parseEther("100"));
      expect(await token.allowance(alice.address, bob.address)).to.equal(ethers.parseEther("100"));

      await token.connect(alice).approve(bob.address, ethers.parseEther("50"));
      expect(await token.allowance(alice.address, bob.address)).to.equal(ethers.parseEther("50"));
    });
  });

  // ──────────────────────────────────────────
  // ROLE MANAGEMENT (AccessControl)
  // ──────────────────────────────────────────

  describe("Role Management (AccessControl)", function () {

    it("should allow admin to grant MINTER_ROLE to a new address", async function () {
      const { token, admin, alice } = await loadFixture(deployFixture);

      await token.connect(admin).grantRole(MINTER_ROLE, alice.address);

      expect(await token.hasRole(MINTER_ROLE, alice.address)).to.equal(true);
    });

    it("should allow new minter to mint after being granted MINTER_ROLE", async function () {
      const { token, admin, alice, bob } = await loadFixture(deployFixture);

      await token.connect(admin).grantRole(MINTER_ROLE, alice.address);
      await token.connect(alice).mint(bob.address, ethers.parseEther("100"));

      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("100"));
    });

    it("should allow admin to revoke MINTER_ROLE", async function () {
      const { token, admin, minter, alice } = await loadFixture(deployFixture);

      await token.connect(admin).revokeRole(MINTER_ROLE, minter.address);

      expect(await token.hasRole(MINTER_ROLE, minter.address)).to.equal(false);

      await expect(
        token.connect(minter).mint(alice.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(minter.address, MINTER_ROLE);
    });

    it("should allow admin to grant PAUSER_ROLE to a new address", async function () {
      const { token, admin, alice } = await loadFixture(deployFixture);

      await token.connect(admin).grantRole(PAUSER_ROLE, alice.address);

      expect(await token.hasRole(PAUSER_ROLE, alice.address)).to.equal(true);

      await token.connect(alice).pause();
      expect(await token.paused()).to.equal(true);
    });

    it("should allow admin to transfer DEFAULT_ADMIN_ROLE to new admin", async function () {
      const { token, admin, alice } = await loadFixture(deployFixture);

      await token.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, alice.address);
      await token.connect(admin).revokeRole(DEFAULT_ADMIN_ROLE, admin.address);

      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, alice.address)).to.equal(true);
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(false);
    });

    it("should prevent non-admin from granting roles", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      await expect(
        token.connect(minter).grantRole(MINTER_ROLE, alice.address)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(minter.address, DEFAULT_ADMIN_ROLE);
    });

    it("should prevent non-admin from revoking roles", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      await expect(
        token.connect(alice).revokeRole(MINTER_ROLE, minter.address)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, DEFAULT_ADMIN_ROLE);
    });

    it("should emit RoleGranted event", async function () {
      const { token, admin, alice } = await loadFixture(deployFixture);

      await expect(token.connect(admin).grantRole(MINTER_ROLE, alice.address))
        .to.emit(token, "RoleGranted")
        .withArgs(MINTER_ROLE, alice.address, admin.address);
    });

    it("should emit RoleRevoked event", async function () {
      const { token, admin, minter } = await loadFixture(deployFixture);

      await expect(token.connect(admin).revokeRole(MINTER_ROLE, minter.address))
        .to.emit(token, "RoleRevoked")
        .withArgs(MINTER_ROLE, minter.address, admin.address);
    });

    it("should allow minter to renounce own MINTER_ROLE", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      await token.connect(minter).renounceRole(MINTER_ROLE, minter.address);

      expect(await token.hasRole(MINTER_ROLE, minter.address)).to.equal(false);
    });

    it("should revert when renouncing DEFAULT_ADMIN_ROLE", async function () {
      const { token, admin } = await loadFixture(deployFixture);

      await expect(
        token.connect(admin).renounceRole(DEFAULT_ADMIN_ROLE, admin.address)
      ).to.be.revertedWithCustomError(token, "AdminRenounceDisabled");
    });

    it("should revert renounceRole with wrong callerConfirmation", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      await expect(
        token.connect(minter).renounceRole(MINTER_ROLE, alice.address)
      ).to.be.revertedWithCustomError(token, "AccessControlBadConfirmation");
    });

    it("should support multiple accounts with the same role", async function () {
      const { token, admin, minter, alice, bob } = await loadFixture(deployFixture);

      await token.connect(admin).grantRole(MINTER_ROLE, alice.address);

      // Both minter and alice can mint
      await token.connect(minter).mint(bob.address, ethers.parseEther("50"));
      await token.connect(alice).mint(bob.address, ethers.parseEther("50"));

      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("100"));
    });

    it("should allow admin to self-revoke DEFAULT_ADMIN_ROLE via revokeRole", async function () {
      const { token, admin, alice } = await loadFixture(deployFixture);

      // First grant alice admin so contract isn't left adminless
      await token.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, alice.address);

      // Admin revokes own admin role
      await token.connect(admin).revokeRole(DEFAULT_ADMIN_ROLE, admin.address);

      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(false);
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, alice.address)).to.equal(true);
    });

    it("should allow key rotation — grant new minter, revoke old minter", async function () {
      const { token, admin, minter, alice, bob } = await loadFixture(deployFixture);

      // Grant new minter
      await token.connect(admin).grantRole(MINTER_ROLE, alice.address);
      // Revoke old minter
      await token.connect(admin).revokeRole(MINTER_ROLE, minter.address);

      // Old minter can no longer mint
      await expect(
        token.connect(minter).mint(bob.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");

      // New minter can mint
      await token.connect(alice).mint(bob.address, ethers.parseEther("100"));
      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("100"));
    });
  });

  // ──────────────────────────────────────────
  // SUPPLY TRACKING
  // ──────────────────────────────────────────

  describe("Supply tracking", function () {

    it("should track supply across many mints", async function () {
      const { token, minter, alice, bob, charlie } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await token.connect(minter).mintForDeed(bob.address, ethers.parseEther("200"), "Deed B");
      await token.connect(minter).mint(charlie.address, ethers.parseEther("300"));

      expect(await token.totalSupply()).to.equal(ethers.parseEther("600"));

      // Transfers don't affect supply
      await token.connect(alice).transfer(bob.address, ethers.parseEther("50"));

      expect(await token.totalSupply()).to.equal(ethers.parseEther("600"));
    });

    it("should handle mints up to per-tx limit", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);

      expect(await token.balanceOf(alice.address)).to.equal(MAX_MINT_PER_TX);
      expect(await token.totalSupply()).to.equal(MAX_MINT_PER_TX);
    });
  });

  // ──────────────────────────────────────────
  // ERC165 — supportsInterface
  // ──────────────────────────────────────────

  describe("ERC165 — supportsInterface", function () {

    it("should support IERC165 interface", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.supportsInterface("0x01ffc9a7")).to.equal(true);
    });

    it("should support IAccessControl interface", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.supportsInterface("0x7965db0b")).to.equal(true);
    });

    it("should support IERC20 interface", async function () {
      const { token } = await loadFixture(deployFixture);
      // IERC20 interface ID = 0x36372b07
      expect(await token.supportsInterface("0x36372b07")).to.equal(true);
    });

    it("should support IERC20Permit interface", async function () {
      const { token } = await loadFixture(deployFixture);
      // Compute: XOR of permit, nonces, DOMAIN_SEPARATOR selectors
      const permitSel = ethers.id(
        "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)"
      ).substring(0, 10);
      const noncesSel = ethers.id("nonces(address)").substring(0, 10);
      const domainSel = ethers.id("DOMAIN_SEPARATOR()").substring(0, 10);

      const xor = BigInt(permitSel) ^ BigInt(noncesSel) ^ BigInt(domainSel);
      const interfaceId = "0x" + (xor & 0xffffffffn).toString(16).padStart(8, "0");

      expect(await token.supportsInterface(interfaceId)).to.equal(true);
    });

    it("should not support invalid interface ID 0xffffffff", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.supportsInterface("0xffffffff")).to.equal(false);
    });

    it("should not support random interface ID", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.supportsInterface("0x12345678")).to.equal(false);
    });
  });

  // ──────────────────────────────────────────
  // BURNING (ERC20Burnable)
  // ──────────────────────────────────────────

  describe("Burning (ERC20Burnable)", function () {

    it("should allow token holder to burn own tokens", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      await token.connect(alice).burn(ethers.parseEther("30"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("70"));
    });

    it("should reduce total supply on burn", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      await token.connect(alice).burn(ethers.parseEther("40"));

      expect(await token.totalSupply()).to.equal(ethers.parseEther("60"));
    });

    it("should emit Transfer event to zero address on burn", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      await expect(token.connect(alice).burn(ethers.parseEther("50")))
        .to.emit(token, "Transfer")
        .withArgs(alice.address, ethers.ZeroAddress, ethers.parseEther("50"));
    });

    it("should revert burn when exceeding balance", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      await expect(
        token.connect(alice).burn(ethers.parseEther("200"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });

    it("should allow burnFrom with allowance", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await token.connect(alice).approve(bob.address, ethers.parseEther("50"));

      await token.connect(bob).burnFrom(alice.address, ethers.parseEther("30"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("70"));
      expect(await token.allowance(alice.address, bob.address)).to.equal(ethers.parseEther("20"));
    });

    it("should revert burnFrom without sufficient allowance", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await token.connect(alice).approve(bob.address, ethers.parseEther("10"));

      await expect(
        token.connect(bob).burnFrom(alice.address, ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
    });

    it("should revert burnFrom when paused", async function () {
      const { token, admin, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await token.connect(alice).approve(bob.address, ethers.parseEther("50"));
      await token.connect(admin).pause();

      await expect(
        token.connect(bob).burnFrom(alice.address, ethers.parseEther("30"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("should revert burn when paused", async function () {
      const { token, admin, minter, alice } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await token.connect(admin).pause();

      await expect(
        token.connect(alice).burn(ethers.parseEther("50"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("should allow burn after unpause", async function () {
      const { token, admin, minter, alice } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await token.connect(admin).pause();
      await token.connect(admin).unpause();

      await token.connect(alice).burn(ethers.parseEther("50"));

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("50"));
    });

    it("should allow burning zero tokens (no-op)", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      await token.connect(alice).burn(0n);

      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));
    });

    it("should allow burning entire balance", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("100");
      await token.connect(minter).mint(alice.address, amount);

      await token.connect(alice).burn(amount);

      expect(await token.balanceOf(alice.address)).to.equal(0n);
      expect(await token.totalSupply()).to.equal(0n);
    });
  });

  // ──────────────────────────────────────────
  // DAILY MINT LIMIT
  // ──────────────────────────────────────────

  describe("Daily mint limit", function () {

    it("should have correct MAX_DAILY_MINT constant", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.MAX_DAILY_MINT()).to.equal(MAX_DAILY_MINT);
    });

    it("should allow minting up to daily limit", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      // Mint 50 times at MAX_MINT_PER_TX (10,000 each) = 500,000 = MAX_DAILY_MINT
      for (let i = 0; i < 50; i++) {
        await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);
      }

      expect(await token.totalSupply()).to.equal(MAX_DAILY_MINT);
    });

    it("should revert when exceeding daily limit via mint()", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      // Mint to daily limit
      for (let i = 0; i < 50; i++) {
        await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);
      }

      // One more wei should fail
      await expect(
        token.connect(minter).mint(alice.address, 1n)
      ).to.be.revertedWithCustomError(token, "DailyMintCapExceeded");
    });

    it("should revert when exceeding daily limit via mintForDeed()", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      // Mint to daily limit
      for (let i = 0; i < 50; i++) {
        await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);
      }

      // mintForDeed should also fail
      await expect(
        token.connect(minter).mintForDeed(alice.address, 1n, "Over limit")
      ).to.be.revertedWithCustomError(token, "DailyMintCapExceeded");
    });

    it("should reset daily limit after one day", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      // Mint to daily limit
      for (let i = 0; i < 50; i++) {
        await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);
      }

      // Advance time by one day
      await time.increase(ONE_DAY);

      // Should be able to mint again
      await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);

      expect(await token.totalSupply()).to.equal(MAX_DAILY_MINT + MAX_MINT_PER_TX);
    });

    it("should track daily limit across mint() and mintForDeed()", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      // Mint 25 via mint() + 25 via mintForDeed() = 50 * 10,000 = 500,000
      for (let i = 0; i < 25; i++) {
        await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);
      }
      for (let i = 0; i < 25; i++) {
        await token.connect(minter).mintForDeed(alice.address, MAX_MINT_PER_TX, `Deed ${i}`);
      }

      // Should be at limit
      await expect(
        token.connect(minter).mint(alice.address, 1n)
      ).to.be.revertedWithCustomError(token, "DailyMintCapExceeded");
    });

    it("should allow minting zero tokens without affecting daily limit", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      // Mint to daily limit
      for (let i = 0; i < 50; i++) {
        await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);
      }

      // Minting zero should still succeed
      await token.connect(minter).mint(alice.address, 0n);
    });

    it("should return 0 for dailyMintedToday initially", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.dailyMintedToday()).to.equal(0n);
    });

    it("should track dailyMintedToday after minting", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await token.connect(minter).mint(alice.address, amount);
      expect(await token.dailyMintedToday()).to.equal(amount);
    });

    it("should reset dailyMintedToday after day boundary", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("1000"));
      await time.increase(ONE_DAY);
      expect(await token.dailyMintedToday()).to.equal(0n);
    });

    it("should enforce daily limit across multiple minters", async function () {
      const { token, admin, minter, alice, bob } = await loadFixture(deployFixture);

      // Grant alice MINTER_ROLE
      await token.connect(admin).grantRole(MINTER_ROLE, alice.address);

      // First minter uses most of the daily limit
      for (let i = 0; i < 49; i++) {
        await token.connect(minter).mint(bob.address, MAX_MINT_PER_TX);
      }

      // Second minter uses one more slot
      await token.connect(alice).mint(bob.address, MAX_MINT_PER_TX);

      // Both minters should now be blocked
      await expect(
        token.connect(minter).mint(bob.address, 1n)
      ).to.be.revertedWithCustomError(token, "DailyMintCapExceeded");

      await expect(
        token.connect(alice).mint(bob.address, 1n)
      ).to.be.revertedWithCustomError(token, "DailyMintCapExceeded");
    });

    it("should include correct args in DailyMintCapExceeded error", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      // Mint to daily limit
      for (let i = 0; i < 50; i++) {
        await token.connect(minter).mint(alice.address, MAX_MINT_PER_TX);
      }

      // Get the current day key
      const latestBlock = await ethers.provider.getBlock("latest");
      const dayKey = BigInt(latestBlock.timestamp) / BigInt(ONE_DAY);

      // Attempt to mint 1 more wei — should get exact error args
      const attemptAmount = 1n;
      const expectedTotal = MAX_DAILY_MINT + attemptAmount;

      await expect(
        token.connect(minter).mint(alice.address, attemptAmount)
      ).to.be.revertedWithCustomError(token, "DailyMintCapExceeded")
        .withArgs(dayKey, expectedTotal, MAX_DAILY_MINT);
    });

    it("should enforce daily limit independently from per-tx limit", async function () {
      const { token, minter, alice } = await loadFixture(deployFixture);

      // Mint a large amount that's under per-tx limit but would exceed daily over time
      const bigMint = ethers.parseEther("9000"); // under 10,000 per-tx limit
      // 500,000 / 9,000 = 55.55, so 55 mints should work, 56th should fail
      for (let i = 0; i < 55; i++) {
        await token.connect(minter).mint(alice.address, bigMint);
      }

      // 55 * 9,000 = 495,000. Remaining = 5,000 SATHU
      const remaining = MAX_DAILY_MINT - ethers.parseEther("495000");
      expect(remaining).to.equal(ethers.parseEther("5000"));

      // Minting 5,001 should fail (exceeds daily)
      await expect(
        token.connect(minter).mint(alice.address, ethers.parseEther("5001"))
      ).to.be.revertedWithCustomError(token, "DailyMintCapExceeded");

      // Minting exactly 5,000 should succeed
      await token.connect(minter).mint(alice.address, ethers.parseEther("5000"));
    });
  });

  // ──────────────────────────────────────────
  // ERC20 PERMIT (EIP-2612)
  // ──────────────────────────────────────────

  describe("ERC20Permit (EIP-2612)", function () {

    // Helper to build domain, types, and sign a permit
    async function signPermit(token, owner, spender, value, deadline) {
      const tokenAddress = await token.getAddress();
      const nonce = await token.nonces(owner.address);
      const chainId = (await ethers.provider.getNetwork()).chainId;

      const domain = {
        name: "SaThuCoin",
        version: "1",
        chainId: chainId,
        verifyingContract: tokenAddress,
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const message = {
        owner: owner.address,
        spender: spender.address,
        value: value,
        nonce: nonce,
        deadline: deadline,
      };

      const sig = await owner.signTypedData(domain, types, message);
      return ethers.Signature.from(sig);
    }

    it("should allow gasless approval via permit", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      const value = ethers.parseEther("50");
      const deadline = (await time.latest()) + 3600;

      const { v, r, s } = await signPermit(token, alice, bob, value, deadline);

      await token.permit(alice.address, bob.address, value, deadline, v, r, s);

      expect(await token.allowance(alice.address, bob.address)).to.equal(value);
    });

    it("should increment nonce after permit", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      expect(await token.nonces(alice.address)).to.equal(0n);

      const value = ethers.parseEther("50");
      const deadline = (await time.latest()) + 3600;
      const { v, r, s } = await signPermit(token, alice, bob, value, deadline);

      await token.permit(alice.address, bob.address, value, deadline, v, r, s);

      expect(await token.nonces(alice.address)).to.equal(1n);
    });

    it("should revert with expired deadline", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      const value = ethers.parseEther("50");
      const deadline = (await time.latest()) - 1; // already expired

      const { v, r, s } = await signPermit(token, alice, bob, value, deadline);

      await expect(
        token.permit(alice.address, bob.address, value, deadline, v, r, s)
      ).to.be.revertedWithCustomError(token, "ERC2612ExpiredSignature");
    });

    it("should revert with wrong signer", async function () {
      const { token, minter, alice, bob, charlie } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      const value = ethers.parseEther("50");
      const deadline = (await time.latest()) + 3600;

      // Charlie signs, but we claim alice is the owner
      const { v, r, s } = await signPermit(token, charlie, bob, value, deadline);

      await expect(
        token.permit(alice.address, bob.address, value, deadline, v, r, s)
      ).to.be.revertedWithCustomError(token, "ERC2612InvalidSigner");
    });

    it("should revert on replay (same signature used twice)", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      const value = ethers.parseEther("50");
      const deadline = (await time.latest()) + 3600;
      const { v, r, s } = await signPermit(token, alice, bob, value, deadline);

      // First use succeeds
      await token.permit(alice.address, bob.address, value, deadline, v, r, s);

      // Second use fails (nonce already consumed)
      await expect(
        token.permit(alice.address, bob.address, value, deadline, v, r, s)
      ).to.be.revertedWithCustomError(token, "ERC2612InvalidSigner");
    });

    it("should allow transferFrom after permit", async function () {
      const { token, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));

      const value = ethers.parseEther("50");
      const deadline = (await time.latest()) + 3600;
      const { v, r, s } = await signPermit(token, alice, bob, value, deadline);

      await token.permit(alice.address, bob.address, value, deadline, v, r, s);
      await token.connect(bob).transferFrom(alice.address, bob.address, ethers.parseEther("30"));

      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("30"));
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("70"));
    });

    it("should return correct DOMAIN_SEPARATOR", async function () {
      const { token } = await loadFixture(deployFixture);

      const domainSeparator = await token.DOMAIN_SEPARATOR();
      expect(domainSeparator).to.not.equal(ethers.ZeroHash);
    });

    it("should return zero nonce for new account", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      expect(await token.nonces(alice.address)).to.equal(0n);
    });

    it("should allow permit when paused (approvals don't trigger _update)", async function () {
      const { token, admin, minter, alice, bob } = await loadFixture(deployFixture);
      await token.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await token.connect(admin).pause();

      const value = ethers.parseEther("50");
      const deadline = (await time.latest()) + 3600;
      const { v, r, s } = await signPermit(token, alice, bob, value, deadline);

      // Permit should succeed even when paused (it only sets allowance)
      await token.permit(alice.address, bob.address, value, deadline, v, r, s);
      expect(await token.allowance(alice.address, bob.address)).to.equal(value);

      // But transferFrom should still fail when paused
      await expect(
        token.connect(bob).transferFrom(alice.address, bob.address, ethers.parseEther("10"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });
  });
});
