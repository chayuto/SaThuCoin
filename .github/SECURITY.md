# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in SaThuCoin, please report it responsibly.

**DO NOT** open a public GitHub issue for security vulnerabilities.

### How to Report

Open a private vulnerability report via [GitHub Security Advisories](https://github.com/chayuto/SaThuCoin/security/advisories/new).

Alternatively, email the project maintainer directly (see GitHub profile).

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment:** Within 48 hours
- **Assessment:** Within 7 days
- **Resolution:** Depends on severity

### Scope

| In Scope | Out of Scope |
|---|---|
| Smart contract (`contracts/`) | Third-party dependencies (report upstream) |
| Deployment scripts (`scripts/`) | Theoretical attacks without proof of concept |
| Scraper/minter (`scraper/`, `cli/`) | Social engineering of maintainers |
| Configuration files (`config/`) | Attacks requiring physical access |

### Safe Harbor

We will not pursue legal action against researchers who:
- Act in good faith
- Avoid data destruction or service disruption
- Report findings privately before any public disclosure
- Do not exploit vulnerabilities beyond what is necessary to demonstrate them

## Supported Versions

| Version | Supported |
|---|---|
| Latest on `main` | Yes |
| Older commits | No |
