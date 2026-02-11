# Security Rules

> Based on the comprehensive security deep dive: @docs/SaThuCoin comprehensive security deep dive.md

## Secrets & Key Management
- NEVER commit `.env`, private keys, mnemonics, or API keys
- NEVER hardcode secrets in source code or Dockerfile layers
- NEVER log private keys or sensitive values — implement pattern-based redaction
- AI agents must NEVER access or handle private keys directly
- Use encrypted keystore or cloud KMS for production key storage
- Save deployment artifacts to `data/` (gitignored), never to tracked files

## Smart Contract Security
- All minting functions must have access control (`onlyOwner` or `onlyRole`)
- Validate addresses before token operations (check for zero address)
- Use `ethers.getAddress()` for EIP-55 checksum validation of scraped addresses
- Consider `Ownable2Step` over `Ownable` to prevent accidental ownership loss
- Consider `ERC20Capped` for supply limits and `ERC20Pausable` for emergency stops
- Use custom errors, not string reverts
- Run static analysis (Slither) before deployment

## Scraper & Minter Security
- Implement per-cycle minting caps (e.g., 50 addresses max per cycle)
- Validate all scraped wallet addresses with strict regex + EIP-55 checksum
- Reject known burn addresses and zero-history addresses from single sources
- Implement nonce management with mutex protection and resync capability
- Use private HTTPS RPC endpoints, never public free RPCs for production
- Wait for "safe" block status before confirming mints on Base

## npm Supply Chain
- Use exact version pinning — NEVER use `^` or `~` in production dependencies
- Use `npm ci` (not `npm install`) in production
- Verify all AI-suggested dependencies against npm registry before installing
- Consider `ignore-scripts=true` in `.npmrc` for CI environments

## AI Agent Security
- All AI-generated code is untrusted — human review required for security-critical paths
- Security-critical code paths requiring human review: minting/burning logic, access control, key handling, deployment scripts, external contract interactions
- Watch for "slopsquatting" — AI hallucinating non-existent package names
- Never blindly trust AI-suggested imports or dependencies

## Agent Deployment Boundary (MANDATORY)
- **AGENT MUST NEVER interact with mainnet or testnet programmatically**
- NEVER run deploy scripts (`npm run deploy:*`, `npx hardhat run scripts/deploy*`)
- NEVER run verify scripts (`npx hardhat run scripts/verify*`)
- NEVER execute any command targeting a live network (`--network base-mainnet`, `--network base-sepolia`)
- NEVER send transactions, call contracts, or query live chain state via scripts
- All deployment, verification, and on-chain operations are **human-executed only**
- The agent MAY write/edit deploy scripts, but MUST NOT execute them
- The agent MAY compile contracts and run local Hardhat tests (these use in-memory chains only)

## Operational Security
- Use separate wallets for project and personal use
- Use hardware wallets for signing deployment transactions
- Review all `Bash` commands involving network requests
- When interacting with external APIs, use environment variables for credentials
