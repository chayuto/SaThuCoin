const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("SaThuCoin", function () {

  // Role constants matching the contract
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  // Constants matching the contract
  const MAX_MINT_PER_TX = ethers.parseEther("10000");
  const SUPPLY_CAP = ethers.parseEther("1000000000"); // 1 billion

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
      ).to.be.revertedWith("Renounce admin disabled");
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
});
