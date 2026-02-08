---
paths:
  - "contracts/**/*.sol"
---

# Solidity Rules

- Target Solidity `^0.8.20`, compiled with `0.8.26`
- Use OpenZeppelin Contracts v5.4.0 — NOT v4
- Constructor pattern: `Ownable(msg.sender)` — NOT `Ownable()`
- Use named imports: `import {ERC20} from "..."` — NOT `import "..."`
- Use custom errors, not string reverts
- Emit events for all state-changing operations
- All functions that modify state must have access control (`onlyOwner`)
- No inline assembly unless explicitly requested
- Optimizer is enabled with 200 runs — keep gas efficiency in mind
- Always recompile after modifying .sol files: `npm run compile`
