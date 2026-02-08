---
paths:
  - "test/**/*.js"
---

# Testing Rules

- Framework: Mocha (via Hardhat) + Chai + `@nomicfoundation/hardhat-toolbox`
- Always use `loadFixture(deployFixture)` for test isolation
- Token amounts: `ethers.parseEther("100")` — NOT `ethers.utils.parseEther()`
- BigInt: use native `100n` — NOT `ethers.BigNumber.from(100)`
- Custom errors: `.to.be.revertedWithCustomError(contract, "ErrorName")` — NOT `.revertedWith("string")`
- Test file: `test/SaThuCoin.test.js` — add new tests inside existing `describe` blocks
- Signers pattern: `const { token, owner, alice, bob } = await loadFixture(deployFixture)`
- Always compile before testing: `npm run compile && npm test`
- Tests must work without `.env` file
