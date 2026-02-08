# Contributing to SaThuCoin

Thank you for your interest in contributing to SaThuCoin! This guide will help you get started.

## Prerequisites

- **Node.js** 18 or later
- **npm** (comes with Node.js)

## Getting Started

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/<your-username>/SaThuCoin.git
   cd SaThuCoin
   ```

2. Install dependencies:

   ```bash
   npm ci
   ```

3. Compile contracts:

   ```bash
   npm run compile
   ```

4. Run tests:

   ```bash
   npm test
   ```

## Branch Naming

Use the following naming conventions for branches:

- `feature/short-description` -- new features
- `fix/short-description` -- bug fixes
- `docs/short-description` -- documentation changes

## Before Submitting a PR

Ensure the following all pass locally:

```bash
npm run compile
npm test
npm run coverage    # must meet 90% threshold
npm run lint:sol    # if Solidity files were changed
```

## PR Process

1. Fill out the pull request template completely.
2. Wait for CI checks to pass.
3. Request a review from a maintainer.
4. Address any feedback and push updates to your branch.

## Code Style

- **CommonJS modules** -- use `require()` and `module.exports`, not `import`/`export`.
- **ethers.js v6 conventions** -- use `ethers.parseEther()`, `waitForDeployment()`, `getAddress()`, native `BigInt`.
- Follow existing patterns in the codebase. When in doubt, look at how similar code is written elsewhere in the project.

## Security

- **Never** commit secrets, private keys, mnemonics, or `.env` files.
- If you discover a security vulnerability, please report it responsibly via [SECURITY.md](SECURITY.md) rather than opening a public issue.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
