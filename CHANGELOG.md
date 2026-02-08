# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `Ownable2Step` for two-step ownership transfer
- `ERC20Capped` for maximum supply limit
- `ERC20Pausable` for emergency stop functionality
- `ERC20Permit` for gasless approvals (EIP-2612)
- Per-transaction mint limit for blast radius control
- `SECURITY.md` with responsible disclosure policy
- `CONTRIBUTING.md` with development guidelines
- `LICENSE` (MIT)
- GitHub issue templates (bug report, feature request)
- GitHub pull request template
- `CODEOWNERS` for required reviews on critical paths
- Dependabot configuration for npm and GitHub Actions
- Husky and lint-staged for pre-commit hooks

### Changed
- npm dependencies pinned to exact versions (no `^` or `~`)

### Security
- `.npmrc` with `ignore-scripts=true` for CI environments
- `@custom:security-contact` NatSpec tag in contract

## [1.0.0] - 2025-01-01

### Added
- SaThuCoin (SATHU) ERC-20 token contract with owner-only minting
- 34 unit tests with full coverage of minting, access control, and edge cases
- Deployment scripts for Base Sepolia and Base Mainnet
- BaseScan contract verification script
- CI/CD pipeline with GitHub Actions (lint, test, coverage, security)
- Comprehensive project documentation
- Reward configuration (`config/rewards.json`)
- Scraper source definitions (`config/sources.json`) for Phase 2
