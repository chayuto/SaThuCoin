---
paths:
  - "scripts/**/*.js"
  - "scraper/**/*.js"
  - "cli/**/*.js"
---

# JavaScript / Node.js Rules

- Module system: **CommonJS** — use `require()` and `module.exports`
- Do NOT use `import`/`export` (ESM)
- Do NOT install `ethers` separately — it is bundled with `@nomicfoundation/hardhat-toolbox`
- Use `dotenv` for environment variables: `require("dotenv").config()`
- Error handling: always catch and log errors with meaningful messages
- File paths: use `path.join(__dirname, "..", "relative/path")` — not string concatenation
- Async/await for all promise-based operations
- Use `process.exitCode = 1` for error exits, not `process.exit(1)` (allows cleanup)
