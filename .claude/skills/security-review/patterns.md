# Security Anti-Pattern Search Patterns

> Reference file for the /security-review skill. These patterns are searched during audits.

## Solidity Anti-Patterns

| Pattern | Risk | Severity |
|---|---|---|
| `tx.origin` | Auth bypass — allows phishing via intermediate contracts | CRITICAL |
| `selfdestruct` | Contract destruction — irrecoverable | CRITICAL |
| `delegatecall` | Proxy abuse — storage collision risk | CRITICAL |
| `Ownable()` (no args) | OZ v4 pattern — sets zero address as owner in v5 | CRITICAL |
| `import ".*\.sol"` (unnamed) | Wrong import style — should use named imports | LOW |
| `require(.*"` (string revert) | Should use custom errors for gas efficiency | LOW |
| `block.timestamp` | Miner manipulation (low risk on L2 sequencer) | LOW |
| `assembly` | Unsafe low-level code — requires careful review | MEDIUM |

## JavaScript Anti-Patterns

| Pattern | Risk | Severity |
|---|---|---|
| `eval(` | Code injection | CRITICAL |
| `child_process` | Command injection | CRITICAL |
| `console.log.*[Kk]ey` | Secret logging | HIGH |
| `console.log.*[Ss]ecret` | Secret logging | HIGH |
| `console.log.*[Mm]nemonic` | Secret logging | HIGH |
| `console.log.*[Pp]rivate` | Secret logging | HIGH |
| `require('http')` (not https) | Unencrypted communication | MEDIUM |
| `process.exit(1)` | Hard exit — prefer `process.exitCode = 1` | LOW |

## Configuration Anti-Patterns

| Pattern | Risk | Severity |
|---|---|---|
| `"\^` in package.json | Unpinned dependency version | CRITICAL |
| `"~` in package.json | Unpinned dependency version | CRITICAL |
| `PRIVATE_KEY=0x` | Hardcoded private key | CRITICAL |
| `"password":` | Hardcoded credential | HIGH |
| `"secret":` | Hardcoded credential | HIGH |
| `"apiKey":` followed by non-env | Hardcoded API key | HIGH |

## Known Burn Addresses to Reject

```
0x0000000000000000000000000000000000000000  (zero address)
0x000000000000000000000000000000000000dEaD  (common burn)
0xdead000000000000000000000000000000000000  (variant burn)
```
