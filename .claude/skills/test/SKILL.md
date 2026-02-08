---
name: test
description: Compile Solidity contracts and run the full test suite. Use when the user asks to test, run tests, or verify changes work.
allowed-tools: Bash(npm run compile), Bash(npm test), Bash(npm run coverage)
argument-hint: "[--coverage]"
---

# /test — Compile and Run Tests

Run the full compile + test cycle for SaThuCoin. This is the standard validation sequence.

## Steps

1. Run `npm run compile` to compile all Solidity contracts
2. If compilation succeeds, run `npm test` to execute the full test suite
3. If `$ARGUMENTS` contains `--coverage`, run `npm run coverage` instead of `npm test`

## Output Requirements

- Show compilation result (success or errors)
- Show full test output with pass/fail counts
- If any tests fail, clearly highlight which tests failed and the error messages
- If compilation fails, do NOT attempt to run tests — report the compilation error and stop

## Error Handling

- If `npm run compile` fails: report the Solidity compilation errors. Common causes:
  - Missing `Ownable(msg.sender)` (OZ v5 requires explicit initial owner)
  - Wrong import paths (use named imports: `import {ERC20} from "..."`)
  - Solidity version mismatch (must be ^0.8.20, compiled with 0.8.26)
- If `npm test` fails: report which tests failed with assertion details

## Key Context

- Tests are in `test/SaThuCoin.test.js` (~25 tests, 7 describe blocks)
- Tests use `loadFixture(deployFixture)` pattern
- Tests do NOT require `.env` — they run on Hardhat's in-memory network
- Token amounts use `ethers.parseEther()` (ethers v6)
- Custom error assertions use `.revertedWithCustomError(contract, "ErrorName")`
