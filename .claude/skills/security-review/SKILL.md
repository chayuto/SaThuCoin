---
name: security-review
description: Comprehensive security audit of SaThuCoin contract, dependencies, deployment scripts, and scraper code. Only invoke manually — never auto-trigger.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Grep, Glob, Bash(npm audit), Bash(npm list *), Bash(npm run compile), Bash(npm run test:gas)
argument-hint: "[scope: all | contract | deps | deploy | scraper]"
---

# /security-review — SaThuCoin Security Audit

Perform a methodical, comprehensive security review of the SaThuCoin project.
**This is a read-only audit. Do not modify any files. Report findings only.**

---

## Scope Selection

Parse `$ARGUMENTS` to determine review scope:

| Argument | Scope | Domains Audited |
|---|---|---|
| (empty) or `all` | Full project | A + B + C + D + E + F |
| `contract` | Smart contract | A only |
| `deps` | Dependencies | C only |
| `deploy` | Deployment scripts | B + E |
| `scraper` | Scraper/minter | D + E |

---

## Domain A: Smart Contract Audit

**Files to read:** `contracts/SaThuCoin.sol`, `test/SaThuCoin.test.js`
**Reference:** `docs/SaThuCoin comprehensive security deep dive.md` (sections 1-2)

### A1. Access Control (CRITICAL)

- [ ] Every state-changing function has `onlyOwner` or role-based modifier
- [ ] No unprotected `mint()`, `burn()`, or `_mint()` calls
- [ ] Constructor correctly initializes ownership: `Ownable(msg.sender)`
- [ ] No use of `tx.origin` for authentication

Search for anti-patterns:
```
Grep for: tx.origin
Grep for: function.*public|external (verify each has access control or is view/pure)
```

### A2. Token Economics (CRITICAL)

- [ ] Check if `ERC20Capped` is used (supply limit)
- [ ] Check if per-tx mint limit exists on-chain (not just in config)
- [ ] Verify no backdoor minting paths (search for all `_mint` calls)
- [ ] Check for any `burn` functionality and its access control

Search for:
```
Grep in contracts/: _mint
Grep in contracts/: _burn
Grep in contracts/: totalSupply
```

### A3. Emergency Controls (HIGH)

- [ ] Check if `ERC20Pausable` is inherited
- [ ] Check if `pause()` and `unpause()` exist with proper access control
- [ ] Check if `Ownable2Step` is used (vs single-step `Ownable`)

### A4. Code Quality (MEDIUM)

- [ ] Named imports used (not `import "..."`)
- [ ] Custom errors used (not string reverts `require(..., "string")`)
- [ ] Events emitted for all state-changing operations
- [ ] NatSpec documentation on all public/external functions
- [ ] `external` visibility preferred over `public` for gas efficiency
- [ ] `calldata` used for string/bytes parameters
- [ ] No inline assembly unless explicitly justified
- [ ] No `selfdestruct` usage
- [ ] No `delegatecall` usage
- [ ] `@custom:security-contact` NatSpec tag present

### A5. Inheritance & Overrides (HIGH when multi-inheritance)

- [ ] `_update()` override resolves diamond inheritance correctly (when ERC20Capped + ERC20Pausable)
- [ ] All required `super._update()` calls present
- [ ] No missing override specifiers

### A6. Test Coverage Assessment (HIGH)

Read `test/SaThuCoin.test.js` and verify:

- [ ] Zero-address minting tested (`mint(address(0), amount)`)
- [ ] Zero-address transfer tested
- [ ] Max uint256 boundary tested
- [ ] Self-transfer tested (alice -> alice)
- [ ] Approval overwrite tested (approve 100, then approve 50)
- [ ] Empty deed string tested
- [ ] Very long deed string tested (gas boundary)
- [ ] Ownership transfer + new owner minting tested
- [ ] Renounce ownership + mint revert tested
- [ ] Non-owner minting revert tested with correct error
- [ ] Event emission verified with `.withArgs()`

---

## Domain B: Deployment Script Audit

**Files to read:** `scripts/deploy.js`, `scripts/verify.js`, `hardhat.config.js`
**Reference:** Gap Analysis (section 2.4)

### B1. Secret Handling (CRITICAL)

- [ ] No hardcoded private keys, addresses, or API keys
- [ ] All secrets loaded from environment variables
- [ ] No secrets logged to console (search for `console.log.*key|secret|private`)

Search for:
```
Grep in scripts/: 0x[a-fA-F0-9]{64}    (private key pattern)
Grep in scripts/: hardcoded|password|secret|mnemonic
Grep in scripts/: console.log
```

### B2. Deployment Safety (HIGH)

- [ ] Balance check before deployment (sufficient gas, not just non-zero)
- [ ] Chain ID validation at runtime
- [ ] Deployment artifacts saved to `data/` (gitignored)
- [ ] Post-deployment state verification (name, symbol, owner)
- [ ] Transaction confirmation waiting
- [ ] Error handling with meaningful messages

### B3. Network Configuration (MEDIUM)

Read `hardhat.config.js`:
- [ ] RPC URLs loaded from environment variables
- [ ] No hardcoded RPC endpoints for production networks
- [ ] BaseScan API key from environment variable
- [ ] Correct chain IDs (Base Sepolia: 84532, Base Mainnet: 8453)

---

## Domain C: Dependency / Supply Chain Audit

**Files to read:** `package.json`, `package-lock.json`, `.npmrc` (if exists)
**Reference:** Security Deep Dive section 3, Security Rules "npm Supply Chain"

### C1. Version Pinning (CRITICAL)

Read `package.json` and check:
- [ ] **No `^` or `~` in any dependency version** (production OR dev)
- [ ] Every dependency uses exact version: `"package": "1.2.3"` not `"^1.2.3"`
- Flag every violation with the current version string

### C2. Dependency Hygiene (HIGH)

- [ ] `package-lock.json` exists and is committed
- [ ] `.npmrc` exists with `ignore-scripts=true`
- [ ] No unnecessary/unused dependencies installed
  - Check: are `axios`, `cheerio`, `node-cron` actually imported anywhere?
  ```
  Grep for: require.*axios
  Grep for: require.*cheerio
  Grep for: require.*node-cron
  ```
- [ ] Run `npm audit` and report findings

### C3. Package Verification (HIGH)

For each dependency, verify:
- [ ] Package exists on npm registry (not a hallucinated name)
- [ ] Package has reasonable download counts and maintenance
- [ ] No known supply chain incidents affecting current versions

Known high-risk npm incidents to be aware of:
- September 2025 "Qix" attack (chalk, debug, supports-color)
- September-November 2025 "Shai-Hulud" worm (500+ packages)
- February 2026 dYdX package compromise

---

## Domain D: Scraper / Minter Audit (Phase 4+)

**Files to read:** `scraper/**/*.js`, `cli/**/*.js` (if they exist)
**Reference:** Security Deep Dive sections 3-5, Project Plan Phases 5-7

### D1. Address Validation (CRITICAL)

- [ ] All scraped addresses validated with `ethers.getAddress()` (EIP-55 checksum)
- [ ] Strict regex extraction: `/0x[0-9a-fA-F]{40}/`
- [ ] Known burn addresses rejected (zero address, dead address)

### D2. Minting Controls (CRITICAL)

- [ ] Per-cycle minting cap enforced (check `config/rewards.json` maxMintsPerCycle)
- [ ] Cap actually enforced in code, not just documented
- [ ] Dry-run mode available and tested

### D3. Key Handling (CRITICAL)

- [ ] Private key loaded from environment only
- [ ] No key logging (search for patterns)
- [ ] No key in source code or config files
```
Grep in scraper/: PRIVATE_KEY
Grep in scraper/: console.log
```

### D4. Nonce Management (HIGH)

- [ ] Nonce managed with mutex protection
- [ ] Resync capability for nonce desync
- [ ] Stuck transaction handling (zero-value self-transfer)

### D5. RPC Security (HIGH)

- [ ] HTTPS endpoints only
- [ ] No public free RPCs for production minting
- [ ] Fallback RPC configured
- [ ] Sequencer uptime checked (Chainlink L2 feed)

### D6. Error Handling (MEDIUM)

- [ ] Failed mints don't crash the cycle
- [ ] Retry logic with exponential backoff
- [ ] Failed wallets not marked as rewarded

---

## Domain E: Configuration & Secrets Audit

**Files to search:** entire repo
**Reference:** Security Rules "Secrets & Key Management"

### E1. Gitignore Coverage (CRITICAL)

Read `.gitignore` and verify:
- [ ] `.env` and `.env.*` are gitignored
- [ ] `data/` directory is gitignored
- [ ] `node_modules/` is gitignored
- [ ] No secret files tracked in git

### E2. Git History (CRITICAL)

```
Bash: git log --all --diff-filter=A -- "*.env" ".env*"
```
- [ ] No `.env` files ever committed in git history
- [ ] No private keys visible in git history

### E3. Config File Safety (HIGH)

Read all files in `config/`:
- [ ] No live API keys, private keys, or secrets
- [ ] Example/placeholder values only
- [ ] Config schema documented or self-evident

---

## Domain F: AI Agent Security Audit

**Files to read:** `.claude/CLAUDE.md`, `.claude/settings.json`, `.claude/rules/*.md`, `.claude/hooks/*`
**Reference:** Security Deep Dive section 6, Security Rules "AI Agent Security"

### F1. Agent Permissions (HIGH)

Read `.claude/settings.json`:
- [ ] `.env` read/edit denied
- [ ] Destructive bash commands denied (`rm -rf`, `git push --force`, `git reset --hard`)
- [ ] Allow list is minimal and appropriate

### F2. Post-Edit Hooks (MEDIUM)

Read `.claude/hooks/post-edit.sh`:
- [ ] Hooks block sensitive file edits
- [ ] Hook correctly identifies `.env`, `secret`, `credential` patterns

### F3. Security Rules (MEDIUM)

Read `.claude/rules/security.md`:
- [ ] Rules match the security deep dive recommendations
- [ ] No contradictions between rules and actual configuration

---

## Report Format

After completing all applicable domain checks, produce a report in this structure:

```markdown
# SaThuCoin Security Review Report

**Date:** [current date]
**Scope:** [what was reviewed]
**Reviewer:** Claude Code /security-review skill

## Summary

- CRITICAL findings: [count]
- HIGH findings: [count]
- MEDIUM findings: [count]
- LOW/INFO findings: [count]

## Findings

### [SEVERITY] Finding Title
- **Domain:** [A/B/C/D/E/F]
- **File:** [file path:line number]
- **Description:** [what's wrong]
- **Risk:** [what could happen]
- **Recommendation:** [how to fix]
- **Reference:** [link to relevant security doc section]

[Repeat for each finding...]

## Checklist Results

[Domain A checklist with pass/fail marks]
[Domain B checklist with pass/fail marks]
[...]

## Recommendations (Prioritized)

1. [Most critical action]
2. [Next most critical]
3. [...]
```

---

## Important Notes

- This skill is **read-only**. Do NOT modify any files.
- Report ALL findings, even if they were previously identified in the gap analysis.
- For each finding, provide the specific file and line number.
- Cross-reference findings against `docs/SaThuCoin comprehensive security deep dive.md` to check if the project follows its own security recommendations.
- The gap between documentation and implementation is itself a finding.
