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
