const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SaThuCompanion", function () {

  // Role constants matching the contracts
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

  // ──────────────────────────────────────────
  // FIXTURES
  // ──────────────────────────────────────────

  // Full fixture: deploys SaThuCoin + SaThuCompanion + grants roles
  // admin  = DEFAULT_ADMIN_ROLE on both contracts + PAUSER_ROLE on SaThuCoin
  // minter = MINTER_ROLE on both contracts
  // companion gets MINTER_ROLE on SaThuCoin (so it can call mintForDeed)
  async function deployCompanionFixture() {
    const [admin, minter, alice, bob, charlie] = await ethers.getSigners();

    // Deploy real SaThuCoin (not a mock)
    const SaThuCoin = await ethers.getContractFactory("SaThuCoin");
    const sathu = await SaThuCoin.deploy(admin.address, minter.address);
    await sathu.waitForDeployment();

    // Deploy Companion
    const SaThuCompanion = await ethers.getContractFactory("SaThuCompanion");
    const companion = await SaThuCompanion.deploy(
      await sathu.getAddress(),
      admin.address,
      minter.address
    );
    await companion.waitForDeployment();

    // Grant companion MINTER_ROLE on SaThuCoin
    await sathu.connect(admin).grantRole(MINTER_ROLE, await companion.getAddress());

    return { sathu, companion, admin, minter, alice, bob, charlie };
  }

  // Fixture with tokens pre-minted to alice (for burn tests)
  async function deployWithTokensFixture() {
    const { sathu, companion, admin, minter, alice, bob, charlie } =
      await loadFixture(deployCompanionFixture);

    // Mint 1000 SATHU to alice via companion
    await companion.connect(minter).mintForDeedTagged(
      alice.address,
      ethers.parseEther("1000"),
      "Test deed",
      "test-source",
      "test-category"
    );

    return { sathu, companion, admin, minter, alice, bob, charlie };
  }

  // Helper to sign an EIP-2612 permit
  async function signPermit(sathu, owner, spender, value, deadline) {
    const tokenAddress = await sathu.getAddress();
    const nonce = await sathu.nonces(owner.address);
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
      spender: spender,
      value: value,
      nonce: nonce,
      deadline: deadline,
    };

    const sig = await owner.signTypedData(domain, types, message);
    return ethers.Signature.from(sig);
  }

  // ──────────────────────────────────────────
  // DEPLOYMENT
  // ──────────────────────────────────────────

  describe("Deployment", function () {

    it("should store correct SaThuCoin reference", async function () {
      const { sathu, companion } = await loadFixture(deployCompanionFixture);
      expect(await companion.sathu()).to.equal(await sathu.getAddress());
    });

    it("should grant DEFAULT_ADMIN_ROLE to admin", async function () {
      const { companion, admin } = await loadFixture(deployCompanionFixture);
      expect(await companion.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.equal(true);
    });

    it("should grant MINTER_ROLE to minter", async function () {
      const { companion, minter } = await loadFixture(deployCompanionFixture);
      expect(await companion.hasRole(MINTER_ROLE, minter.address)).to.equal(true);
    });

    it("should not grant MINTER_ROLE to admin (when different)", async function () {
      const { companion, admin } = await loadFixture(deployCompanionFixture);
      expect(await companion.hasRole(MINTER_ROLE, admin.address)).to.equal(false);
    });

    it("should not be paused initially", async function () {
      const { companion } = await loadFixture(deployCompanionFixture);
      expect(await companion.paused()).to.equal(false);
    });

    it("should revert when sathu address is zero", async function () {
      const [admin, minter] = await ethers.getSigners();
      const SaThuCompanion = await ethers.getContractFactory("SaThuCompanion");
      await expect(
        SaThuCompanion.deploy(ethers.ZeroAddress, admin.address, minter.address)
      ).to.be.revertedWithCustomError(SaThuCompanion, "ZeroAddressNotAllowed");
    });

    it("should revert when admin address is zero", async function () {
      const { sathu } = await loadFixture(deployCompanionFixture);
      const [, minter] = await ethers.getSigners();
      const SaThuCompanion = await ethers.getContractFactory("SaThuCompanion");
      await expect(
        SaThuCompanion.deploy(await sathu.getAddress(), ethers.ZeroAddress, minter.address)
      ).to.be.revertedWithCustomError(SaThuCompanion, "ZeroAddressNotAllowed");
    });

    it("should revert when minter address is zero", async function () {
      const { sathu } = await loadFixture(deployCompanionFixture);
      const [admin] = await ethers.getSigners();
      const SaThuCompanion = await ethers.getContractFactory("SaThuCompanion");
      await expect(
        SaThuCompanion.deploy(await sathu.getAddress(), admin.address, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(SaThuCompanion, "ZeroAddressNotAllowed");
    });

    it("should support IAccessControl interface", async function () {
      const { companion } = await loadFixture(deployCompanionFixture);
      // IAccessControl interface ID = 0x7965db0b
      expect(await companion.supportsInterface("0x7965db0b")).to.equal(true);
    });
  });

  // ──────────────────────────────────────────
  // MINT FOR DEED TAGGED
  // ──────────────────────────────────────────

  describe("mintForDeedTagged()", function () {

    it("should mint tokens on SaThuCoin and emit DeedRecorded", async function () {
      const { sathu, companion, minter, alice } = await loadFixture(deployCompanionFixture);
      const amount = ethers.parseEther("100");
      const deed = "Donated to Red Cross";
      const source = "charity-alpha";
      const category = "healthcare";

      await expect(
        companion.connect(minter).mintForDeedTagged(alice.address, amount, deed, source, category)
      ).to.emit(companion, "DeedRecorded")
        .withArgs(
          alice.address,
          ethers.keccak256(ethers.toUtf8Bytes(source)),
          ethers.keccak256(ethers.toUtf8Bytes(category)),
          amount,
          deed,
          source,
          category
        );

      expect(await sathu.balanceOf(alice.address)).to.equal(amount);
    });

    it("should emit DeedRecorded with correct indexed sourceId", async function () {
      const { companion, minter, alice } = await loadFixture(deployCompanionFixture);
      const source = "charity-beta";
      const sourceHash = ethers.keccak256(ethers.toUtf8Bytes(source));

      const tx = await companion.connect(minter).mintForDeedTagged(
        alice.address, ethers.parseEther("10"), "Test", source, "general"
      );
      const receipt = await tx.wait();

      // Find DeedRecorded event in companion logs
      const companionAddress = await companion.getAddress();
      const deedRecordedLog = receipt.logs.find(
        (log) => log.address.toLowerCase() === companionAddress.toLowerCase() &&
          log.topics.length === 4
      );

      // topics[2] should be the sourceId
      expect(deedRecordedLog.topics[2]).to.equal(sourceHash);
    });

    it("should emit DeedRecorded with correct indexed categoryId", async function () {
      const { companion, minter, alice } = await loadFixture(deployCompanionFixture);
      const category = "education";
      const categoryHash = ethers.keccak256(ethers.toUtf8Bytes(category));

      const tx = await companion.connect(minter).mintForDeedTagged(
        alice.address, ethers.parseEther("10"), "Test", "source-a", category
      );
      const receipt = await tx.wait();

      const companionAddress = await companion.getAddress();
      const deedRecordedLog = receipt.logs.find(
        (log) => log.address.toLowerCase() === companionAddress.toLowerCase() &&
          log.topics.length === 4
      );

      // topics[3] should be the categoryId
      expect(deedRecordedLog.topics[3]).to.equal(categoryHash);
    });

    it("should also emit Transfer and DeedRewarded on SaThuCoin (same tx)", async function () {
      const { sathu, companion, minter, alice } = await loadFixture(deployCompanionFixture);
      const amount = ethers.parseEther("50");

      const tx = companion.connect(minter).mintForDeedTagged(
        alice.address, amount, "Good deed", "source-a", "healthcare"
      );

      // SaThuCoin events
      await expect(tx).to.emit(sathu, "Transfer")
        .withArgs(ethers.ZeroAddress, alice.address, amount);
      await expect(tx).to.emit(sathu, "DeedRewarded")
        .withArgs(alice.address, amount, "Good deed");
      // Companion event
      await expect(tx).to.emit(companion, "DeedRecorded");
    });

    it("should increase recipient balance on SaThuCoin", async function () {
      const { sathu, companion, minter, alice } = await loadFixture(deployCompanionFixture);
      const amount = ethers.parseEther("200");

      await companion.connect(minter).mintForDeedTagged(
        alice.address, amount, "Deed", "src", "cat"
      );

      expect(await sathu.balanceOf(alice.address)).to.equal(amount);
    });

    it("should increase totalSupply on SaThuCoin", async function () {
      const { sathu, companion, minter, alice } = await loadFixture(deployCompanionFixture);
      const amount = ethers.parseEther("300");

      await companion.connect(minter).mintForDeedTagged(
        alice.address, amount, "Deed", "src", "cat"
      );

      expect(await sathu.totalSupply()).to.equal(amount);
    });

    it("should revert when caller lacks MINTER_ROLE on companion", async function () {
      const { companion, alice, bob } = await loadFixture(deployCompanionFixture);

      await expect(
        companion.connect(alice).mintForDeedTagged(
          bob.address, ethers.parseEther("10"), "Deed", "src", "cat"
        )
      ).to.be.revertedWithCustomError(companion, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, MINTER_ROLE);
    });

    it("should revert when companion lacks MINTER_ROLE on SaThuCoin", async function () {
      const { sathu, admin, minter, alice } = await loadFixture(deployCompanionFixture);

      // Deploy a second companion WITHOUT granting it MINTER_ROLE on SaThuCoin
      const SaThuCompanion = await ethers.getContractFactory("SaThuCompanion");
      const orphanCompanion = await SaThuCompanion.deploy(
        await sathu.getAddress(), admin.address, minter.address
      );
      await orphanCompanion.waitForDeployment();

      await expect(
        orphanCompanion.connect(minter).mintForDeedTagged(
          alice.address, ethers.parseEther("10"), "Deed", "src", "cat"
        )
      ).to.be.reverted;
    });

    it("should revert when companion is paused", async function () {
      const { companion, admin, minter, alice } = await loadFixture(deployCompanionFixture);

      await companion.connect(admin).pause();

      await expect(
        companion.connect(minter).mintForDeedTagged(
          alice.address, ethers.parseEther("10"), "Deed", "src", "cat"
        )
      ).to.be.revertedWithCustomError(companion, "EnforcedPause");
    });

    it("should revert when SaThuCoin is paused", async function () {
      const { sathu, companion, admin, minter, alice } = await loadFixture(deployCompanionFixture);

      // Pause SaThuCoin (admin has PAUSER_ROLE on SaThuCoin)
      await sathu.connect(admin).pause();

      await expect(
        companion.connect(minter).mintForDeedTagged(
          alice.address, ethers.parseEther("10"), "Deed", "src", "cat"
        )
      ).to.be.reverted; // SaThuCoin reverts with EnforcedPause
    });

    it("should revert when amount exceeds SaThuCoin per-tx limit", async function () {
      const { companion, minter, alice } = await loadFixture(deployCompanionFixture);
      const tooMuch = ethers.parseEther("10001");

      await expect(
        companion.connect(minter).mintForDeedTagged(
          alice.address, tooMuch, "Deed", "src", "cat"
        )
      ).to.be.revertedWithCustomError(
        // Error comes from SaThuCoin
        await ethers.getContractAt("SaThuCoin", await companion.sathu()),
        "MintAmountExceedsLimit"
      );
    });

    it("should revert when minting to zero address", async function () {
      const { companion, minter } = await loadFixture(deployCompanionFixture);

      await expect(
        companion.connect(minter).mintForDeedTagged(
          ethers.ZeroAddress, ethers.parseEther("10"), "Deed", "src", "cat"
        )
      ).to.be.reverted;
    });

    it("should handle empty deed, source, and category strings", async function () {
      const { companion, minter, alice } = await loadFixture(deployCompanionFixture);

      await expect(
        companion.connect(minter).mintForDeedTagged(
          alice.address, ethers.parseEther("10"), "", "", ""
        )
      ).to.emit(companion, "DeedRecorded")
        .withArgs(
          alice.address,
          ethers.keccak256(ethers.toUtf8Bytes("")),
          ethers.keccak256(ethers.toUtf8Bytes("")),
          ethers.parseEther("10"),
          "",
          "",
          ""
        );
    });

    it("should handle long strings", async function () {
      const { companion, minter, alice } = await loadFixture(deployCompanionFixture);
      const longStr = "A".repeat(500);

      await expect(
        companion.connect(minter).mintForDeedTagged(
          alice.address, ethers.parseEther("10"), longStr, longStr, longStr
        )
      ).to.emit(companion, "DeedRecorded");
    });

    it("should allow minting to multiple addresses", async function () {
      const { sathu, companion, minter, alice, bob } = await loadFixture(deployCompanionFixture);

      await companion.connect(minter).mintForDeedTagged(
        alice.address, ethers.parseEther("10"), "D1", "src", "cat"
      );
      await companion.connect(minter).mintForDeedTagged(
        bob.address, ethers.parseEther("20"), "D2", "src", "cat"
      );

      expect(await sathu.balanceOf(alice.address)).to.equal(ethers.parseEther("10"));
      expect(await sathu.balanceOf(bob.address)).to.equal(ethers.parseEther("20"));
      expect(await sathu.totalSupply()).to.equal(ethers.parseEther("30"));
    });
  });

  // ──────────────────────────────────────────
  // BURN WITH OFFERING
  // ──────────────────────────────────────────

  describe("burnWithOffering()", function () {

    it("should burn tokens on SaThuCoin and emit OfferingMade", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const offering = "สาธุ";

      // Approve companion to spend alice's tokens
      await sathu.connect(alice).approve(await companion.getAddress(), amount);

      await expect(
        companion.connect(alice).burnWithOffering(amount, offering)
      ).to.emit(companion, "OfferingMade")
        .withArgs(alice.address, amount, offering);
    });

    it("should emit OfferingMade with correct offerer, amount, and offering", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("50");
      const offering = "For all beings";

      await sathu.connect(alice).approve(await companion.getAddress(), amount);

      await expect(
        companion.connect(alice).burnWithOffering(amount, offering)
      ).to.emit(companion, "OfferingMade")
        .withArgs(alice.address, amount, offering);
    });

    it("should also emit Transfer to zero address on SaThuCoin (same tx)", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");

      await sathu.connect(alice).approve(await companion.getAddress(), amount);

      await expect(
        companion.connect(alice).burnWithOffering(amount, "Offering")
      ).to.emit(sathu, "Transfer")
        .withArgs(alice.address, ethers.ZeroAddress, amount);
    });

    it("should reduce caller's balance on SaThuCoin", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("200");

      await sathu.connect(alice).approve(await companion.getAddress(), amount);
      await companion.connect(alice).burnWithOffering(amount, "Offering");

      expect(await sathu.balanceOf(alice.address)).to.equal(ethers.parseEther("800"));
    });

    it("should reduce totalSupply on SaThuCoin", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("300");

      await sathu.connect(alice).approve(await companion.getAddress(), amount);
      await companion.connect(alice).burnWithOffering(amount, "Offering");

      expect(await sathu.totalSupply()).to.equal(ethers.parseEther("700"));
    });

    it("should revert when caller has not approved companion", async function () {
      const { companion, alice } = await loadFixture(deployWithTokensFixture);

      await expect(
        companion.connect(alice).burnWithOffering(ethers.parseEther("10"), "Offering")
      ).to.be.reverted;
    });

    it("should revert when approved amount is insufficient", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);

      await sathu.connect(alice).approve(await companion.getAddress(), ethers.parseEther("5"));

      await expect(
        companion.connect(alice).burnWithOffering(ethers.parseEther("10"), "Offering")
      ).to.be.reverted;
    });

    it("should revert when caller balance is insufficient", async function () {
      const { sathu, companion, bob } = await loadFixture(deployWithTokensFixture);

      // bob has no tokens
      await sathu.connect(bob).approve(
        await companion.getAddress(), ethers.parseEther("100")
      );

      await expect(
        companion.connect(bob).burnWithOffering(ethers.parseEther("10"), "Offering")
      ).to.be.reverted;
    });

    it("should revert when companion is paused", async function () {
      const { sathu, companion, admin, alice } = await loadFixture(deployWithTokensFixture);

      await sathu.connect(alice).approve(await companion.getAddress(), ethers.parseEther("100"));
      await companion.connect(admin).pause();

      await expect(
        companion.connect(alice).burnWithOffering(ethers.parseEther("10"), "Offering")
      ).to.be.revertedWithCustomError(companion, "EnforcedPause");
    });

    it("should revert when SaThuCoin is paused", async function () {
      const { sathu, companion, admin, alice } = await loadFixture(deployWithTokensFixture);

      await sathu.connect(alice).approve(await companion.getAddress(), ethers.parseEther("100"));
      await sathu.connect(admin).pause();

      await expect(
        companion.connect(alice).burnWithOffering(ethers.parseEther("10"), "Offering")
      ).to.be.reverted;
    });

    it("should allow after unpause", async function () {
      const { sathu, companion, admin, alice } = await loadFixture(deployWithTokensFixture);

      await sathu.connect(alice).approve(await companion.getAddress(), ethers.parseEther("100"));
      await companion.connect(admin).pause();
      await companion.connect(admin).unpause();

      await expect(
        companion.connect(alice).burnWithOffering(ethers.parseEther("10"), "Offering")
      ).to.emit(companion, "OfferingMade");
    });

    it("should handle empty offering string", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);

      await sathu.connect(alice).approve(await companion.getAddress(), ethers.parseEther("10"));

      await expect(
        companion.connect(alice).burnWithOffering(ethers.parseEther("10"), "")
      ).to.emit(companion, "OfferingMade")
        .withArgs(alice.address, ethers.parseEther("10"), "");
    });

    it("should handle long offering string", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const longOffering = "A".repeat(500);

      await sathu.connect(alice).approve(await companion.getAddress(), ethers.parseEther("10"));

      await expect(
        companion.connect(alice).burnWithOffering(ethers.parseEther("10"), longOffering)
      ).to.emit(companion, "OfferingMade");
    });

    it("should handle Pali offering string", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const offering = "อิติปิโส ภะคะวา อะระหัง สัมมาสัมพุทโธ";

      await sathu.connect(alice).approve(await companion.getAddress(), ethers.parseEther("10"));

      await expect(
        companion.connect(alice).burnWithOffering(ethers.parseEther("10"), offering)
      ).to.emit(companion, "OfferingMade")
        .withArgs(alice.address, ethers.parseEther("10"), offering);
    });

    it("should allow burning zero tokens (no-op)", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);

      await sathu.connect(alice).approve(await companion.getAddress(), 0n);

      await expect(
        companion.connect(alice).burnWithOffering(0n, "Offering")
      ).to.emit(companion, "OfferingMade")
        .withArgs(alice.address, 0n, "Offering");
    });

    it("should allow burning entire balance", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const balance = await sathu.balanceOf(alice.address);

      await sathu.connect(alice).approve(await companion.getAddress(), balance);
      await companion.connect(alice).burnWithOffering(balance, "Everything");

      expect(await sathu.balanceOf(alice.address)).to.equal(0n);
    });

    it("should work with tokens received via transfer (not just minted)", async function () {
      const { sathu, companion, minter, alice, bob } = await loadFixture(deployWithTokensFixture);

      // alice transfers to bob
      await sathu.connect(alice).transfer(bob.address, ethers.parseEther("100"));

      // bob burns via companion
      await sathu.connect(bob).approve(await companion.getAddress(), ethers.parseEther("50"));

      await expect(
        companion.connect(bob).burnWithOffering(ethers.parseEther("50"), "From transfer")
      ).to.emit(companion, "OfferingMade")
        .withArgs(bob.address, ethers.parseEther("50"), "From transfer");
    });

    it("should reduce allowance after burn", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const companionAddr = await companion.getAddress();

      await sathu.connect(alice).approve(companionAddr, ethers.parseEther("100"));
      await companion.connect(alice).burnWithOffering(ethers.parseEther("30"), "Offering");

      expect(await sathu.allowance(alice.address, companionAddr)).to.equal(
        ethers.parseEther("70")
      );
    });

    it("should not require MINTER_ROLE (any holder can burn)", async function () {
      const { sathu, companion, minter, alice } = await loadFixture(deployWithTokensFixture);

      // alice does NOT have MINTER_ROLE — should still burn
      expect(await companion.hasRole(MINTER_ROLE, alice.address)).to.equal(false);

      await sathu.connect(alice).approve(await companion.getAddress(), ethers.parseEther("10"));

      await expect(
        companion.connect(alice).burnWithOffering(ethers.parseEther("10"), "Anyone can burn")
      ).to.emit(companion, "OfferingMade");
    });
  });

  // ──────────────────────────────────────────
  // BURN WITH OFFERING PERMIT
  // ──────────────────────────────────────────

  describe("burnWithOfferingPermit()", function () {

    it("should burn tokens with permit in single transaction", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;

      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);

      await expect(
        companion.connect(alice).burnWithOfferingPermit(amount, "สาธุ", deadline, v, r, s)
      ).to.emit(companion, "OfferingMade")
        .withArgs(alice.address, amount, "สาธุ");

      expect(await sathu.balanceOf(alice.address)).to.equal(ethers.parseEther("900"));
    });

    it("should emit OfferingMade with correct args", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("50");
      const offering = "For all beings";
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;

      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);

      await expect(
        companion.connect(alice).burnWithOfferingPermit(amount, offering, deadline, v, r, s)
      ).to.emit(companion, "OfferingMade")
        .withArgs(alice.address, amount, offering);
    });

    it("should emit Approval and Transfer on SaThuCoin (same tx)", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;

      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);

      const tx = companion.connect(alice).burnWithOfferingPermit(
        amount, "Offering", deadline, v, r, s
      );

      // Permit causes Approval event on SaThuCoin
      await expect(tx).to.emit(sathu, "Approval")
        .withArgs(alice.address, companionAddr, amount);
      // BurnFrom causes Transfer to zero on SaThuCoin
      await expect(tx).to.emit(sathu, "Transfer")
        .withArgs(alice.address, ethers.ZeroAddress, amount);
    });

    it("should reduce caller balance and totalSupply", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("200");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;

      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);

      await companion.connect(alice).burnWithOfferingPermit(amount, "Offering", deadline, v, r, s);

      expect(await sathu.balanceOf(alice.address)).to.equal(ethers.parseEther("800"));
      expect(await sathu.totalSupply()).to.equal(ethers.parseEther("800"));
    });

    it("should revert with expired deadline", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) - 1; // expired

      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);

      // Permit fails (expired), try/catch absorbs it, but burnFrom
      // also fails because no allowance exists.
      await expect(
        companion.connect(alice).burnWithOfferingPermit(amount, "Offering", deadline, v, r, s)
      ).to.be.reverted;
    });

    it("should revert with wrong signer", async function () {
      const { sathu, companion, alice, bob } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;

      // Bob signs, but alice submits claiming to be the owner
      const { v, r, s } = await signPermit(sathu, bob, companionAddr, amount, deadline);

      // Permit fails (wrong signer for alice's nonce), try/catch absorbs it,
      // but burnFrom also fails because no allowance exists for alice.
      await expect(
        companion.connect(alice).burnWithOfferingPermit(amount, "Offering", deadline, v, r, s)
      ).to.be.reverted;
    });

    it("should revert on replay (same signature used twice)", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;

      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);

      // First call succeeds
      await companion.connect(alice).burnWithOfferingPermit(
        amount, "First", deadline, v, r, s
      );

      // Second call: permit fails (nonce consumed), try/catch absorbs it,
      // but burnFrom fails because allowance was consumed by first burn.
      await expect(
        companion.connect(alice).burnWithOfferingPermit(
          amount, "Second", deadline, v, r, s
        )
      ).to.be.reverted;
    });

    it("should revert when balance is insufficient", async function () {
      const { sathu, companion, bob } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;

      // bob has no tokens
      const { v, r, s } = await signPermit(sathu, bob, companionAddr, amount, deadline);

      await expect(
        companion.connect(bob).burnWithOfferingPermit(amount, "Offering", deadline, v, r, s)
      ).to.be.reverted;
    });

    it("should revert when companion is paused", async function () {
      const { sathu, companion, admin, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;

      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);

      await companion.connect(admin).pause();

      await expect(
        companion.connect(alice).burnWithOfferingPermit(amount, "Offering", deadline, v, r, s)
      ).to.be.revertedWithCustomError(companion, "EnforcedPause");
    });

    it("should revert when SaThuCoin is paused", async function () {
      const { sathu, companion, admin, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;

      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);

      // Pause SaThuCoin — permit still works but burnFrom will fail
      await sathu.connect(admin).pause();

      await expect(
        companion.connect(alice).burnWithOfferingPermit(amount, "Offering", deadline, v, r, s)
      ).to.be.reverted;
    });

    it("should increment nonce on SaThuCoin", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;

      expect(await sathu.nonces(alice.address)).to.equal(0n);

      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);
      await companion.connect(alice).burnWithOfferingPermit(amount, "Offering", deadline, v, r, s);

      expect(await sathu.nonces(alice.address)).to.equal(1n);
    });

    it("should not require MINTER_ROLE (any holder can burn)", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("10");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;

      expect(await companion.hasRole(MINTER_ROLE, alice.address)).to.equal(false);

      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);

      await expect(
        companion.connect(alice).burnWithOfferingPermit(amount, "No role needed", deadline, v, r, s)
      ).to.emit(companion, "OfferingMade");
    });
  });

  // ──────────────────────────────────────────
  // PAUSING
  // ──────────────────────────────────────────

  describe("Pausing", function () {

    it("should allow admin to pause", async function () {
      const { companion, admin } = await loadFixture(deployCompanionFixture);
      await companion.connect(admin).pause();
      expect(await companion.paused()).to.equal(true);
    });

    it("should allow admin to unpause", async function () {
      const { companion, admin } = await loadFixture(deployCompanionFixture);
      await companion.connect(admin).pause();
      await companion.connect(admin).unpause();
      expect(await companion.paused()).to.equal(false);
    });

    it("should emit Paused event", async function () {
      const { companion, admin } = await loadFixture(deployCompanionFixture);
      await expect(companion.connect(admin).pause())
        .to.emit(companion, "Paused")
        .withArgs(admin.address);
    });

    it("should emit Unpaused event", async function () {
      const { companion, admin } = await loadFixture(deployCompanionFixture);
      await companion.connect(admin).pause();
      await expect(companion.connect(admin).unpause())
        .to.emit(companion, "Unpaused")
        .withArgs(admin.address);
    });

    it("should revert when non-admin tries to pause", async function () {
      const { companion, alice } = await loadFixture(deployCompanionFixture);
      await expect(
        companion.connect(alice).pause()
      ).to.be.revertedWithCustomError(companion, "AccessControlUnauthorizedAccount")
        .withArgs(alice.address, DEFAULT_ADMIN_ROLE);
    });

    it("should revert when minter tries to pause", async function () {
      const { companion, minter } = await loadFixture(deployCompanionFixture);
      await expect(
        companion.connect(minter).pause()
      ).to.be.revertedWithCustomError(companion, "AccessControlUnauthorizedAccount")
        .withArgs(minter.address, DEFAULT_ADMIN_ROLE);
    });

    it("should block mintForDeedTagged when paused", async function () {
      const { companion, admin, minter, alice } = await loadFixture(deployCompanionFixture);
      await companion.connect(admin).pause();
      await expect(
        companion.connect(minter).mintForDeedTagged(
          alice.address, ethers.parseEther("10"), "D", "s", "c"
        )
      ).to.be.revertedWithCustomError(companion, "EnforcedPause");
    });

    it("should block burnWithOffering when paused", async function () {
      const { sathu, companion, admin, alice } = await loadFixture(deployWithTokensFixture);
      await sathu.connect(alice).approve(await companion.getAddress(), ethers.parseEther("10"));
      await companion.connect(admin).pause();
      await expect(
        companion.connect(alice).burnWithOffering(ethers.parseEther("10"), "Offering")
      ).to.be.revertedWithCustomError(companion, "EnforcedPause");
    });

    it("should block burnWithOfferingPermit when paused", async function () {
      const { sathu, companion, admin, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("10");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;
      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);

      await companion.connect(admin).pause();

      await expect(
        companion.connect(alice).burnWithOfferingPermit(amount, "Offering", deadline, v, r, s)
      ).to.be.revertedWithCustomError(companion, "EnforcedPause");
    });

    it("should resume all operations after unpause", async function () {
      const { sathu, companion, admin, minter, alice } =
        await loadFixture(deployWithTokensFixture);

      await companion.connect(admin).pause();
      await companion.connect(admin).unpause();

      // Mint works
      await companion.connect(minter).mintForDeedTagged(
        alice.address, ethers.parseEther("10"), "D", "s", "c"
      );

      // Burn works
      await sathu.connect(alice).approve(await companion.getAddress(), ethers.parseEther("10"));
      await companion.connect(alice).burnWithOffering(ethers.parseEther("10"), "Offering");
    });
  });

  // ──────────────────────────────────────────
  // ACCESS CONTROL
  // ──────────────────────────────────────────

  describe("Access Control", function () {

    it("should allow admin to grant MINTER_ROLE", async function () {
      const { companion, admin, alice } = await loadFixture(deployCompanionFixture);
      await companion.connect(admin).grantRole(MINTER_ROLE, alice.address);
      expect(await companion.hasRole(MINTER_ROLE, alice.address)).to.equal(true);
    });

    it("should allow admin to revoke MINTER_ROLE", async function () {
      const { companion, admin, minter } = await loadFixture(deployCompanionFixture);
      await companion.connect(admin).revokeRole(MINTER_ROLE, minter.address);
      expect(await companion.hasRole(MINTER_ROLE, minter.address)).to.equal(false);
    });

    it("should allow new minter to call mintForDeedTagged", async function () {
      const { sathu, companion, admin, alice, bob } = await loadFixture(deployCompanionFixture);

      await companion.connect(admin).grantRole(MINTER_ROLE, alice.address);
      await companion.connect(alice).mintForDeedTagged(
        bob.address, ethers.parseEther("10"), "D", "s", "c"
      );

      expect(await sathu.balanceOf(bob.address)).to.equal(ethers.parseEther("10"));
    });

    it("should revert when revoked minter calls mintForDeedTagged", async function () {
      const { companion, admin, minter, alice } = await loadFixture(deployCompanionFixture);

      await companion.connect(admin).revokeRole(MINTER_ROLE, minter.address);

      await expect(
        companion.connect(minter).mintForDeedTagged(
          alice.address, ethers.parseEther("10"), "D", "s", "c"
        )
      ).to.be.revertedWithCustomError(companion, "AccessControlUnauthorizedAccount")
        .withArgs(minter.address, MINTER_ROLE);
    });

    it("should prevent non-admin from granting roles", async function () {
      const { companion, minter, alice } = await loadFixture(deployCompanionFixture);
      await expect(
        companion.connect(minter).grantRole(MINTER_ROLE, alice.address)
      ).to.be.revertedWithCustomError(companion, "AccessControlUnauthorizedAccount")
        .withArgs(minter.address, DEFAULT_ADMIN_ROLE);
    });

    it("should emit RoleGranted event", async function () {
      const { companion, admin, alice } = await loadFixture(deployCompanionFixture);
      await expect(companion.connect(admin).grantRole(MINTER_ROLE, alice.address))
        .to.emit(companion, "RoleGranted")
        .withArgs(MINTER_ROLE, alice.address, admin.address);
    });

    it("should emit RoleRevoked event", async function () {
      const { companion, admin, minter } = await loadFixture(deployCompanionFixture);
      await expect(companion.connect(admin).revokeRole(MINTER_ROLE, minter.address))
        .to.emit(companion, "RoleRevoked")
        .withArgs(MINTER_ROLE, minter.address, admin.address);
    });

    it("should support multiple minters", async function () {
      const { sathu, companion, admin, minter, alice, bob } =
        await loadFixture(deployCompanionFixture);

      await companion.connect(admin).grantRole(MINTER_ROLE, alice.address);

      // Both minter and alice can mint
      await companion.connect(minter).mintForDeedTagged(
        bob.address, ethers.parseEther("10"), "D1", "s", "c"
      );
      await companion.connect(alice).mintForDeedTagged(
        bob.address, ethers.parseEther("20"), "D2", "s", "c"
      );

      expect(await sathu.balanceOf(bob.address)).to.equal(ethers.parseEther("30"));
    });
  });

  // ──────────────────────────────────────────
  // INTEGRATION WITH SATHUCOIN
  // ──────────────────────────────────────────

  describe("Integration with SaThuCoin", function () {

    it("should respect SaThuCoin daily mint limit across companion + direct mints", async function () {
      const { sathu, companion, minter, alice } = await loadFixture(deployCompanionFixture);
      const MAX_MINT_PER_TX = ethers.parseEther("10000");

      // Mint 49 * 10k = 490k via companion
      for (let i = 0; i < 49; i++) {
        await companion.connect(minter).mintForDeedTagged(
          alice.address, MAX_MINT_PER_TX, `Deed ${i}`, "src", "cat"
        );
      }

      // Mint 1 * 10k = 10k direct on SaThuCoin (total = 500k = daily limit)
      await sathu.connect(minter).mint(alice.address, MAX_MINT_PER_TX);

      // One more via companion should fail (daily limit reached)
      await expect(
        companion.connect(minter).mintForDeedTagged(
          alice.address, 1n, "Over limit", "src", "cat"
        )
      ).to.be.reverted;
    });

    it("should respect SaThuCoin per-tx limit", async function () {
      const { companion, minter, alice } = await loadFixture(deployCompanionFixture);

      await expect(
        companion.connect(minter).mintForDeedTagged(
          alice.address, ethers.parseEther("10001"), "D", "s", "c"
        )
      ).to.be.reverted;
    });

    it("should work when SaThuCoin has multiple minters (companion + direct)", async function () {
      const { sathu, companion, minter, alice, bob } = await loadFixture(deployCompanionFixture);

      // Mint via companion
      await companion.connect(minter).mintForDeedTagged(
        alice.address, ethers.parseEther("100"), "D", "s", "c"
      );

      // Mint directly on SaThuCoin
      await sathu.connect(minter).mintForDeed(
        bob.address, ethers.parseEther("200"), "Direct deed"
      );

      expect(await sathu.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));
      expect(await sathu.balanceOf(bob.address)).to.equal(ethers.parseEther("200"));
      expect(await sathu.totalSupply()).to.equal(ethers.parseEther("300"));
    });

    it("direct mint on SaThuCoin still works after companion deployed", async function () {
      const { sathu, minter, alice } = await loadFixture(deployCompanionFixture);

      await sathu.connect(minter).mintForDeed(
        alice.address, ethers.parseEther("500"), "Direct deed"
      );

      expect(await sathu.balanceOf(alice.address)).to.equal(ethers.parseEther("500"));
    });

    it("direct burn on SaThuCoin still works after companion deployed", async function () {
      const { sathu, minter, alice } = await loadFixture(deployCompanionFixture);

      await sathu.connect(minter).mint(alice.address, ethers.parseEther("100"));
      await sathu.connect(alice).burn(ethers.parseEther("30"));

      expect(await sathu.balanceOf(alice.address)).to.equal(ethers.parseEther("70"));
    });

    it("should free cap space after burn (can mint again)", async function () {
      const { sathu, companion, minter, alice } = await loadFixture(deployWithTokensFixture);

      const supplyBefore = await sathu.totalSupply();

      // Burn 500 via companion
      await sathu.connect(alice).approve(await companion.getAddress(), ethers.parseEther("500"));
      await companion.connect(alice).burnWithOffering(ethers.parseEther("500"), "Offering");

      const supplyAfter = await sathu.totalSupply();
      expect(supplyAfter).to.equal(supplyBefore - ethers.parseEther("500"));

      // Can mint again (freed cap space)
      await companion.connect(minter).mintForDeedTagged(
        alice.address, ethers.parseEther("500"), "D", "s", "c"
      );
    });
  });

  // ──────────────────────────────────────────
  // SECURITY TESTS
  // ──────────────────────────────────────────

  describe("Security", function () {

    it("should revert when sending ETH to companion (no receive/fallback)", async function () {
      const { companion, alice } = await loadFixture(deployCompanionFixture);

      await expect(
        alice.sendTransaction({
          to: await companion.getAddress(),
          value: ethers.parseEther("1"),
        })
      ).to.be.reverted;
    });

    it("should handle permit front-running gracefully", async function () {
      const { sathu, companion, alice, bob } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;

      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);

      // Simulate front-run: someone calls permit directly on SaThuCoin
      await sathu.permit(alice.address, companionAddr, amount, deadline, v, r, s);

      // Allowance is set by the front-runner
      expect(await sathu.allowance(alice.address, companionAddr)).to.equal(amount);

      // The user's burnWithOfferingPermit should still succeed
      // because try/catch absorbs the permit failure, and the
      // allowance is already set from the front-run.
      await expect(
        companion.connect(alice).burnWithOfferingPermit(amount, "Offering", deadline, v, r, s)
      ).to.emit(companion, "OfferingMade")
        .withArgs(alice.address, amount, "Offering");
    });

    it("should succeed burnWithOfferingPermit if prior approval exists", async function () {
      const { sathu, companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const companionAddr = await companion.getAddress();

      // Alice manually approves (no permit needed)
      await sathu.connect(alice).approve(companionAddr, amount);

      // Call burnWithOfferingPermit with garbage signature —
      // permit will fail (try/catch absorbs), but burnFrom succeeds
      // because manual approval exists.
      const deadline = (await time.latest()) + 3600;
      const v = 27;
      const r = ethers.ZeroHash;
      const s = ethers.ZeroHash;

      await expect(
        companion.connect(alice).burnWithOfferingPermit(amount, "Manual approval", deadline, v, r, s)
      ).to.emit(companion, "OfferingMade")
        .withArgs(alice.address, amount, "Manual approval");
    });

    it("should revert burnWithOfferingPermit if no allowance and permit fails", async function () {
      const { companion, alice } = await loadFixture(deployWithTokensFixture);
      const amount = ethers.parseEther("100");
      const deadline = (await time.latest()) + 3600;

      // Garbage signature — permit fails, no prior approval
      const v = 27;
      const r = ethers.ZeroHash;
      const s = ethers.ZeroHash;

      await expect(
        companion.connect(alice).burnWithOfferingPermit(amount, "Fail", deadline, v, r, s)
      ).to.be.reverted;
    });

    it("should verify ISaThuCoin interface matches real contract", async function () {
      const { sathu, companion, minter, alice } = await loadFixture(deployCompanionFixture);

      // If the interface doesn't match, these calls would revert with
      // opaque errors. Successful calls prove the interface is correct.

      // Test mintForDeed via companion
      await companion.connect(minter).mintForDeedTagged(
        alice.address, ethers.parseEther("10"), "D", "s", "c"
      );
      expect(await sathu.balanceOf(alice.address)).to.equal(ethers.parseEther("10"));

      // Test burnFrom via companion
      await sathu.connect(alice).approve(await companion.getAddress(), ethers.parseEther("5"));
      await companion.connect(alice).burnWithOffering(ethers.parseEther("5"), "Offering");
      expect(await sathu.balanceOf(alice.address)).to.equal(ethers.parseEther("5"));

      // Test permit via companion
      const amount = ethers.parseEther("5");
      const companionAddr = await companion.getAddress();
      const deadline = (await time.latest()) + 3600;
      const { v, r, s } = await signPermit(sathu, alice, companionAddr, amount, deadline);
      await companion.connect(alice).burnWithOfferingPermit(
        amount, "Permit burn", deadline, v, r, s
      );
      expect(await sathu.balanceOf(alice.address)).to.equal(0n);
    });
  });
});
