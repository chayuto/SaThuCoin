# SaThuCoin comprehensive security deep dive

**The single greatest threat to SaThuCoin is private key compromise — responsible for 43.8% of all crypto funds stolen in 2024 — followed by supply chain attacks on npm dependencies and the unique risks of AI-generated smart contract code.** This document maps every meaningful attack surface for the project: an ERC-20 token on Base chain with owner-only minting, a Node.js scraper/minter engine, and AI coding agents generating code. Each section provides specific risks rated by severity, concrete mitigations, code examples, and real-world incident references. The architecture choices made in the first 48 hours of development — role separation, mint caps, key storage — will determine whether a single compromised credential can destroy the entire token economy or merely cause a contained, recoverable incident.

---

## 1. Smart contract attack surface is narrow but the owner key is everything

SaThuCoin's contract is simple — a mintable ERC-20 built on OpenZeppelin v5 — which dramatically reduces the smart contract attack surface. Most infamous ERC-20 vulnerabilities (reentrancy, flash loan exploits, integer overflow) **do not apply** to a straightforward mintable token that holds no ETH and has no DeFi logic.

**What does apply, ranked by severity:**

| Risk | Severity | Applies? | Mitigation |
|------|----------|----------|------------|
| Owner key compromise → unlimited minting | **CRITICAL** | YES | Multisig + role separation + mint cap |
| Uncapped supply (no max) | **HIGH** | If no cap | `ERC20Capped` + per-tx limit |
| No emergency pause | **MEDIUM** | If no pause | `ERC20Pausable` |
| Approval race condition (ERC-20 inherent) | **MEDIUM** | YES | `ERC20Permit` (EIP-2612) |
| PUSH0 opcode L2 incompatibility | **MEDIUM** | Base supports PUSH0 ✅ | Verify `evmVersion: "shanghai"` |
| Event manipulation for off-chain state | **MEDIUM** | YES | Verify events by contract address + cross-check state |
| Reentrancy | LOW | No external calls | N/A |
| Flash loan attacks | LOW | No DeFi logic | N/A |
| Gas griefing | LOW | Owner-only mint | N/A |

**OpenZeppelin v5 brought meaningful security improvements** over v4: ERC-777 (the reentrancy-prone token standard) was removed entirely, `Ownable` now requires an explicit `initialOwner` parameter preventing zero-address bugs, custom errors replace string reverts for gas savings, and the `_update()` hook replaces the dual `_beforeTokenTransfer`/`_afterTokenTransfer` pattern. No critical advisories exist for v5's non-upgradeable ERC20 as of February 2026.

**The contract should be immutable, not upgradeable.** Analysis of 37 upgrade-related attacks found 7 incidents exceeding $10M and 2 exceeding $100M. The PAID Network hack ($3M, March 2021) exploited a compromised proxy admin key to upgrade the contract and mint/burn tokens at will. Roughly **50% of upgradeable proxies on Ethereum are controlled by a single EOA** — the exact attack surface upgradeability creates. A simple mintable ERC-20 doesn't need upgradeability. If a critical bug is found, deploy a new token and migrate via snapshot airdrop.

### Ownable2Step vs AccessControl — the critical design choice

**`Ownable` (basic) should never be used.** A single-step `transferOwnership` to the wrong address permanently loses all admin capability. `Ownable2Step` requires the new owner to call `acceptOwnership()`, preventing accidental transfers. **`AccessControl` with separate `MINTER_ROLE` is the recommended approach** because it enables the key architectural pattern that limits blast radius: the admin (a Safe multisig) controls role management while a hot wallet holds only the `MINTER_ROLE`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @custom:security-contact security@sathucoin.example
contract SaThuCoin is ERC20, ERC20Capped, ERC20Pausable, ERC20Permit, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant MAX_MINT_PER_TX = 1_000_000 * 10 ** 18;

    constructor(address admin, address minter)
        ERC20("SaThuCoin", "STU")
        ERC20Capped(1_000_000_000 * 10 ** 18)
        ERC20Permit("SaThuCoin")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);   // Safe multisig
        _grantRole(MINTER_ROLE, minter);          // Bot hot wallet
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(amount <= MAX_MINT_PER_TX, "Exceeds per-tx mint limit");
        _mint(to, amount);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    function _update(address from, address to, uint256 value)
        internal override(ERC20, ERC20Capped, ERC20Pausable) { super._update(from, to, value); }
}
```

### Static analysis pipeline every project must run

**Slither** (Trail of Bits) catches reentrancy with 97.8% accuracy and runs in 2–5 seconds — it's the primary recommendation for CI/CD integration. **Mythril** (ConsenSys) uses symbolic execution and generates attack traces but takes 30–120 seconds. A Kleros 2025 study found most tools missed even basic vulnerabilities, so manual review remains essential. The recommended pipeline: `solhint` for linting → `slither` for static analysis → `mythril` for deep analysis → Foundry fuzzer for dynamic testing.

### Real-world ERC-20 hacks worth studying

The **BeautyChain (BEC) BatchOverflow** (April 2018, CVE-2018-10299) generated astronomical tokens from integer overflow in a custom `batchTransfer` — mitigated by Solidity 0.8+. **PAID Network** (March 2021, ~$3M) had a compromised proxy admin key used to upgrade and mint. **GAMEE Token** (January 2024, $7M) suffered deployer address compromise from insufficient access control. Each confirms the same lesson: **access control and key management matter far more than exotic smart contract bugs** for simple tokens.

---

## 2. Private keys are the crown jewels — protect them accordingly

**Trail of Bits reported in June 2025 that 43.8% of all crypto funds stolen in 2024 came from private key compromise** — more than any other attack vector by 5×. For SaThuCoin, the minter's private key must be "hot" (available for automated signing), which creates an inherent tension between operational necessity and security.

### The tiered architecture that limits blast radius

The correct architecture separates admin from operations:

- **Cold tier — Safe multisig (2-of-3 with hardware wallet signers):** Controls `DEFAULT_ADMIN_ROLE`. Used for granting/revoking roles, emergency pause, parameter changes. Accessed weekly or less.
- **Hot tier — Dedicated minter bot EOA:** Holds only `MINTER_ROLE`. Key in encrypted keystore or cloud KMS. Limited ETH balance. **Cannot** change admin, pause, or revoke roles.
- **Monitoring layer:** Alerts on unexpected mints, ownership changes, ETH balance drops.

If the minter key is compromised, the attacker can only mint (capped per-tx). They cannot change admin, upgrade, or revoke roles. The Safe admin can **immediately revoke the compromised minter role**.

### Key storage from simple to enterprise-grade

| Level | Solution | Security | Complexity | Cost |
|-------|----------|----------|-----------|------|
| 1 | `.env` file (chmod 600) | Low — plaintext on disk | Minimal | Free |
| 2 | Encrypted keystore + passphrase | Medium — AES-128-CTR encrypted | Low | Free |
| 3 | AWS Secrets Manager | High — encrypted, access-controlled | Medium | ~$0.40/secret/month |
| 4 | AWS KMS / Azure Key Vault | Very high — key never leaves HSM | High | ~$1/key/month |
| 5 | HashiCorp Vault | Very high — dynamic secrets, audit trail | High | Free (OSS) |

For the Node.js minter, the minimum acceptable approach is **encrypted keystore**:

```javascript
const { Wallet, JsonRpcProvider } = require('ethers');

// Boot-time decryption — key is encrypted at rest
const keystoreJson = process.env.ENCRYPTED_KEYSTORE;
const password = process.env.KEYSTORE_PASSWORD; // or prompt at startup
const wallet = await Wallet.fromEncryptedJson(keystoreJson, password);
const signer = wallet.connect(new JsonRpcProvider(process.env.BASE_RPC_URL));
```

### Catastrophic key incidents that prove the stakes

The **Ronin Bridge hack** ($625M, March 2022) started with a fake LinkedIn job offer containing spyware that compromised 5 of 9 validator keys — and went **undetected for 6 days**. The **Wintermute hack** ($160M, September 2022) exploited the Profanity vanity address generator's 32-bit seed, making keys brute-forceable. The **Slope wallet** incident ($4.1M, August 2022) inadvertently transmitted user seed phrases to a Sentry error-logging service — a devastating reminder to **never log private keys**. The **Harmony Horizon Bridge** ($100M, June 2022) used a dangerously low 2-of-5 multisig threshold.

### Key rotation without redeployment

OpenZeppelin's `AccessControl` supports runtime role management. To rotate the minter key: (1) generate a new minter wallet, (2) from the Safe, call `grantRole(MINTER_ROLE, newMinterAddress)`, (3) call `revokeRole(MINTER_ROLE, oldMinterAddress)`, (4) retire the old key. Ownership transfer with `Ownable2Step` requires the new owner to `acceptOwnership()`, preventing accidental transfers to wrong addresses.

---

## 3. The Node.js minter service is a high-value target

The long-running scraper/minter process handles private keys, makes blockchain transactions, and processes external data — making it a prime target. Three critical domains require hardening: **dependency supply chain, RPC endpoint security, and server infrastructure**.

### npm supply chain attacks are an existential threat

**The September 2025 "Qix" attack** backdoored 18 packages with **2.6 billion combined weekly downloads** — including `chalk`, `debug`, `supports-color`, and `ansi-styles` — by phishing a single maintainer. The injected crypto-stealer hijacked ETH/BTC/SOL wallet transactions. Malicious versions were live for ~2.5 hours. The **"Shai-Hulud" worm** (September–November 2025) self-replicated across 500+ npm packages, harvesting credentials and npm tokens to infect more packages automatically. Its November variant added a **dead man's switch** that destroys the victim's home directory if exfiltration fails. In February 2026, the **dYdX package** `@dydxprotocol/v4-client-js` was compromised with wallet-stealing malware specifically targeting crypto developers.

Every SaThuCoin dependency is an attack surface. Mandatory mitigations:

```bash
# Use npm ci in production — respects lockfile exactly
npm ci  # NOT npm install

# Disable lifecycle scripts by default
echo "ignore-scripts=true" >> .npmrc

# Pin exact versions — never use ^ or ~
# "ethers": "6.9.0"  NOT "^6.9.0"

# Verify lockfile integrity
npx lockfile-lint --path package-lock.json --type npm --allowed-hosts npm --validate-https

# Deep behavioral analysis (catches what npm audit misses)
npx socket scan

# Minimize dependencies — the scraper/minter needs only ethers, a fetch library, and an HTML parser
```

### RPC endpoint security and verification

A compromised or malicious RPC provider could return false transaction confirmations, causing double-mints or lost funds (**Critical severity**). Always use **private HTTPS endpoints** from Alchemy, QuickNode, or Infura — never public free RPCs for production minting. Verify critical responses against a second provider:

```javascript
const RPC_ENDPOINTS = [
  process.env.PRIMARY_RPC_URL,   // Alchemy
  process.env.SECONDARY_RPC_URL, // QuickNode
  process.env.TERTIARY_RPC_URL,  // Public fallback
];

async function getHealthyProvider() {
  for (const url of RPC_ENDPOINTS) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await provider.getBlockNumber(); // Health check
      return provider;
    } catch (e) {
      logger.warn(`RPC failed: ${url.substring(0, 20)}...`);
    }
  }
  throw new Error('All RPC endpoints failed');
}
```

### Server hardening and Docker security

The VPS running the minter should follow a strict lockdown: **non-root user** for the service, SSH key-only authentication on a non-default port, **UFW deny-by-default for both incoming and outgoing** (only allow HTTPS outbound for RPC and scraping, DNS, and SSH), Fail2ban for brute-force protection, and automatic security updates. If containerized, use Alpine-based images with `--read-only` filesystem, `--cap-drop ALL`, `--security-opt no-new-privileges`, and **never store secrets in Dockerfile layers**.

### Logging must actively redact secrets

The Slope wallet incident proved that telemetry systems can catastrophically leak keys. Implement pattern-based redaction:

```javascript
const redactSecrets = winston.format((info) => {
  const patterns = [
    /0x[a-fA-F0-9]{64}/g,          // Private keys
    /(?:key|token|secret|password)[=:]\s*["']?[\w\-\.]+/gi,
  ];
  let msg = typeof info.message === 'string' ? info.message : JSON.stringify(info.message);
  for (const p of patterns) msg = msg.replace(p, '[REDACTED]');
  info.message = msg;
  return info;
});
```

---

## 4. Scraper data integrity determines who receives tokens

The scraper is SaThuCoin's oracle — it decides which wallet addresses are legitimate recipients. A compromised scraper means tokens go to the wrong addresses. **Every layer of the scraping pipeline needs validation.**

### Defending against compromised source websites

If a scraped site is hacked and publishes attacker-controlled wallet addresses, the minter dutifully sends tokens to the attacker. Mitigations form a defense-in-depth stack: **multi-source corroboration** (only mint to addresses found on ≥2 independent sources), **source reputation scoring** (new domains start with low trust), **on-chain activity verification** (zero-history addresses from a single source are quarantined), and **content integrity hashing** (sudden mass changes to wallet addresses on a page trigger alerts).

### Three-step address validation prevents injection

Scraped strings could contain injection payloads embedded around address-like text. The validation pipeline must: (1) extract with strict regex, (2) validate EIP-55 checksum (which provides **99.998% error detection** — less than 1 in 1 million addresses have fewer than 32 check bits), and (3) reject known burn addresses:

```javascript
function sanitizeScrapedAddress(raw) {
  const match = raw.match(/0x[0-9a-fA-F]{40}/);
  if (!match) return null;
  try {
    return ethers.getAddress(match[0]); // EIP-55 checksum + normalization
  } catch { return null; }
}
```

### The per-cycle safety valve is non-negotiable

Without a cap, a compromised scrape could trigger minting to thousands of addresses in a single cycle. Set a **hard maximum** (e.g., 500 addresses per cycle) based on expected normal volume plus a margin. Excess addresses spill into a review queue. If 3 consecutive cycles hit the cap, investigate before raising it. Combine with **anomaly detection** — track a 7-day rolling average of new wallets per cycle and alert when current cycle exceeds 2.5 standard deviations above the mean.

---

## 5. Base chain's L2 architecture creates unique operational risks

Base is an Optimistic Rollup on the OP Stack (same as Optimism), currently classified as **Stage 1** by L2BEAT. It inherits Ethereum's data availability guarantees but introduces centralization risks around the sequencer, different finality guarantees, and specific operational challenges for automated minting.

### The sequencer is a single point of failure

Base's sequencer is operated solely by Coinbase. Documented outages include a **43-minute halt** in September 2023 and a **33-minute halt** in August 2025 (the backup sequencer was not fully provisioned and couldn't produce blocks). During downtime, **no L2 transactions can be processed** — minting stops completely. Use Chainlink's L2 Sequencer Uptime Feed to detect downtime programmatically:

```javascript
const SEQUENCER_FEED = '0xBCF85224fc0756B9Fa45aAb7d2d9dFA0404C35bD';
async function isSequencerUp(provider) {
  const abi = ['function latestRoundData() view returns (uint80,int256,uint256,uint256,uint80)'];
  const feed = new ethers.Contract(SEQUENCER_FEED, abi, provider);
  const [, answer, , updatedAt] = await feed.latestRoundData();
  return answer.toString() === '0' && (Date.now() / 1000 - Number(updatedAt)) < 3600;
}
```

### Nonce management is the #1 operational challenge

Nonce desync is the most common cause of failed automated transactions. If nonce 5 fails, nonces 6, 7, 8 are all stuck — a cascading failure. The minter needs a **mutex-protected nonce manager** with resync capability:

```javascript
class NonceManager {
  constructor(provider, wallet) {
    this.provider = provider;
    this.wallet = wallet;
    this.currentNonce = null;
    this.mutex = Promise.resolve();
  }
  async initialize() {
    this.currentNonce = await this.provider.getTransactionCount(this.wallet.address, 'latest');
  }
  async acquireNonce() {
    return new Promise((resolve) => {
      this.mutex = this.mutex.then(() => {
        const nonce = this.currentNonce++;
        resolve(nonce);
      });
    });
  }
  async resync() {
    const chainNonce = await this.provider.getTransactionCount(this.wallet.address, 'latest');
    if (chainNonce > this.currentNonce) this.currentNonce = chainNonce;
  }
}
```

For stuck transactions, send a **zero-value self-transfer** with the missing nonce to unblock the queue.

### MEV and finality on Base

Base has **no public mempool** — transactions go directly to the sequencer — so classic front-running is not possible. Minting transactions (not DEX swaps) are low-risk for sandwich attacks since they don't move a market price. For confirmation safety, Base has three finality levels: **unsafe** (sequencer tip, ~2 sec, can be reorged), **safe** (batched to L1, ~minutes, reorg only if L1 reorgs), and **finalized** (L1 finalized + challenge window, ~7 days). For minting, wait for **safe** block status before considering a mint confirmed.

---

## 6. AI coding agents introduce a new class of security risk

SaThuCoin uses Claude, Cursor, and Copilot to generate code — a workflow that introduces risks absent from traditional development. **The Stanford CCS 2023 study found that developers with AI access wrote significantly less secure code while being more likely to believe it was secure** — a dangerous overconfidence effect.

### AI-generated smart contracts contain severe flaws

A systematic analysis of LLM-generated Solidity contracts (arXiv 2602.04039, 2025) found that despite syntactic correctness and functional completeness, **LLM-generated contracts frequently exhibit severe security flaws** including reentrancy, improper initialization, and missing access controls. The NYU Tandon study ("Asleep at the Keyboard?", IEEE S&P 2022) found that **~40% of Copilot-generated programs contained exploitable vulnerabilities**. A 2024 ACM TOSEM study of 452 real-world Copilot snippets found **29.8% contained security weaknesses** across 42 CWE types.

Anthropic's own SCONE-bench study (December 2025) demonstrated that frontier AI models autonomously exploited 207 of 405 real-world smart contracts, simulating **$550M in stolen funds** at a cost of ~$1.22 per contract scanned. Exploit capability is doubling every 1.3 months.

### Prompt injection is the #1 LLM application risk

**OWASP ranks prompt injection as the #1 security risk for LLM applications in 2025.** When AI coding agents read external data — scraped web content, npm READMEs, GitHub issues — those sources can contain indirect prompt injections. **CVE-2025-54135 (CurXecute)**, rated CVSS 9.8, showed that a single Slack message could cause Cursor's agent to rewrite MCP configuration and execute arbitrary commands with developer-level privileges. The "Your AI, My Shell" study (arXiv 2509.22040) found that **even with the simplest attack strategies, agentic coding editors are highly vulnerable** to external data poisoning.

### "Slopsquatting" — AI hallucinating malicious dependencies

A USENIX Security 2025 study analyzing 576,000 code samples from 16 LLMs found a **19.6% average package hallucination rate** — AI recommends packages that don't exist. Attackers register malicious packages under these hallucinated names. Lasso Security demonstrated this: an empty package named `huggingface-cli` (a hallucinated name) received **30,000+ downloads** in 3 months. For SaThuCoin, every AI-suggested dependency must be manually verified against the npm registry before installation.

### AI agents must never access private keys

This is the single most dangerous practice possible. If an AI agent with key access is susceptible to prompt injection (as all current agents are), a single malicious input can cause key exfiltration. Blockchain transactions are **irreversible** — unlike traditional systems where transactions can be reversed. Google Cloud explicitly recommends the **non-custodial "transaction crafter" model**: AI agents propose transactions but never hold keys. Humans review and sign.

### What must always be human-reviewed

Regardless of how capable AI tools become, these code paths require expert human review: token minting/burning logic, access control implementation, private key handling, deployment scripts, external contract interactions, and emergency functions. Use AI for boilerplate; hand-write security-critical functions.

---

## 7. Open source transparency strengthens security with caveats

Since the contract is verified on BaseScan, the source is already public — GitHub publication adds marginal risk. However, **the scraper source code reveals monitoring targets, minting trigger conditions, and rate-limiting logic** — genuine operational intelligence an attacker could use. Publish the framework but keep target addresses, thresholds, and scraping logic in private config files not committed to the repo.

### Git history is a secret graveyard

GitHub reported **39 million leaked secrets** detected in public repositories in 2024. Install `git-secrets` as a pre-commit hook, enable GitHub Secret Scanning with Push Protection, and if a key is accidentally committed, **treat it as compromised immediately** — rotate the key first, then clean history with BFG Repo-Cleaner or `git-filter-repo`. Even after force-pushing, GitHub PRs retain references — consider deleting and recreating the repository for certainty.

### Responsible disclosure for smart contracts

Create a `SECURITY.md` with a security contact email, PGP key link, 48-hour acknowledgment SLA, scope definition, and **safe harbor clause** protecting good-faith researchers. For DeFi projects, Immunefi is the dominant bug bounty platform. The SWC Registry (Smart Contract Weakness Classification) is the contract equivalent of CVEs.

---

## 8. Operational security protects the human behind the project

In H1 2025, social engineering drained **$340M+ across Bitcoin, Ethereum, and Solana**. The $1.5B Bybit hack (February 2025) exploited human workflows via sophisticated phishing of multisig signers. DPRK-linked groups (Lazarus, KONNI) target crypto developers with fake job offers containing spyware.

### Essential OpSec practices

- **Separate wallets**: Never link project wallet to personal wallet. Fund project wallets through exchanges to break on-chain linkage.
- **Dedicated devices**: Use a separate laptop for deployment/signing with minimal software and no personal use. The Bybit hack reportedly started from a compromised employee machine.
- **Phishing defense**: Bookmark legitimate sites (BaseScan, MetaMask). Never enter seed phrases on any website. Use hardware wallets requiring physical confirmation. In January 2026, SlowMist documented active fake MetaMask 2FA email campaigns with domains differing by one letter.
- **SIM swap protection**: Use a carrier PIN and consider a separate phone number for crypto 2FA.
- **Backup strategy**: Write seed phrases on metal plates (fireproof, waterproof), stored in a home safe AND a separate secure location. Never store digitally in plaintext.

---

## 9. Path C on-chain donation monitoring has unique gaming vectors

If SaThuCoin pivots to monitoring on-chain donations to known charity wallets, the primary risks shift to **fake donation attacks and wash trading**.

**Verifying charity wallet addresses is the foundation** — hardcode verified addresses confirmed directly with the charity through official channels. Cross-reference The Giving Block, Charity Navigator, and official charity websites. GiveDirectly has documented cases where projects claimed to send donations to charity but contract code allowed behavior rewriting.

**Dust attacks** (sending tiny amounts to game monitoring) are the most likely exploit: an attacker spams micro-donations to trigger excessive minting. Mitigations include a **minimum donation threshold** (>$1), rate limiting on minting frequency, aggregation over time windows rather than per-transaction minting, and diminishing returns for repeated donations from the same address.

**Flash loans are lower risk** than they appear for this use case: the off-chain Node.js scraper naturally introduces latency that breaks atomic exploitation. If a flash loan donation reverts (repayment fails), the donation also reverts — it never happened on-chain. Still, waiting for multiple block confirmations before triggering minting adds safety.

**Wash trading** (self-donations or circular flows) requires detection: track if donated funds return to sender within a time window, flag addresses sharing common funding sources, and impose maximum minting credit per address.

---

## 10. Security checklists and incident response save projects

### Pre-deployment checklist (smart contract)

- [ ] All functions have correct access control (`onlyRole`, not unprotected)
- [ ] Supply cap enforced via `ERC20Capped`
- [ ] `Pausable` mechanism present with admin-only access
- [ ] Solidity version pinned (`pragma solidity 0.8.20;` not `^0.8.20`)
- [ ] No `receive()` or `fallback()` functions (contract should never hold ETH)
- [ ] Slither static analysis: zero critical/high findings
- [ ] Deployed and tested on Base Sepolia testnet
- [ ] Verified on BaseScan after mainnet deployment
- [ ] Owner transferred from deployer EOA to Safe multisig
- [ ] `@custom:security-contact` NatSpec tag present

### Pre-deployment checklist (infrastructure)

- [ ] No hardcoded secrets — all in `.env` (chmod 600) or secrets manager
- [ ] `npm ci` with pinned versions, `--ignore-scripts` in `.npmrc`
- [ ] Socket.dev scan shows no malicious dependencies
- [ ] Private RPC endpoints configured with HTTPS
- [ ] Logging redaction confirmed for private key patterns
- [ ] PM2/systemd configured with auto-restart and memory limits
- [ ] UFW deny-by-default (including outbound) enabled
- [ ] GitHub Secret Scanning and branch protection enabled
- [ ] `SECURITY.md` published

### Incident response — the first 60 minutes

**Scenario A — Key compromise detected:**
1. **T+0 min**: Transfer ownership/revoke roles from compromised key (if you detect first)
2. **T+1 min**: Pause the contract
3. **T+5 min**: Rotate all related credentials (RPC keys, server access, GitHub tokens)
4. **T+15 min**: Post public acknowledgment: "We are investigating an issue. Do not interact with the contract."
5. **T+60 min**: Detailed status update with scope assessment
6. **T+24h**: Comprehensive update; begin snapshot/migration planning if needed

**Scenario B — Scraper exploit detected:**
1. Stop scraper immediately
2. Assess minting logs for unauthorized mints
3. Pause contract if unauthorized mints confirmed
4. Patch vulnerability before restarting

**When to pause — the decision framework:** Immediately pause on confirmed active exploit, key compromise, or unauthorized minting. Evaluate and likely pause on credible vulnerability reports or anomalous transaction patterns. Monitor closely but don't pause on theoretical vulnerabilities or similar-project exploits. **If in doubt, pause.** The cost of a brief service interruption is trivially small compared to continued exploitation.

### Post-deployment monitoring

Use **OpenZeppelin Defender Monitor** for real-time contract event watching with alerts to Slack/Telegram/Discord. Watch for: ownership transfers, pause events, minting above threshold, role changes. Supplement with **Forta Network** detection bots for decentralized transaction scanning. Run weekly manual review of all minting transactions against scraper logs, and periodic comparison of scraper data against block explorer records.

---

## Conclusion: security is architecture, not afterthought

The research across all 10 dimensions converges on a single architectural principle: **separation of privilege limits blast radius**. A Safe multisig holding admin rights, a dedicated hot wallet holding only the minter role, a capped supply with per-transaction limits, and a pausable contract together ensure that no single compromised credential can destroy the token economy. The three most impactful actions are: **(1)** implement `AccessControl` with role separation and a Safe multisig as admin, **(2)** lock down npm dependencies with exact pinning, `ignore-scripts`, and Socket.dev scanning (the September 2025 attacks proved npm is actively and successfully targeted), and **(3)** treat every line of AI-generated code as untrusted input requiring human security review — the Stanford study's finding that AI access increases developer overconfidence while decreasing code security is the most counterintuitive and dangerous dynamic in this entire threat model.

The scraper/minter's per-cycle wallet cap, address validation pipeline, and anomaly detection form the operational safety net. Base chain's centralized sequencer and nonce management challenges require robust retry logic and RPC fallbacks. And the human operating the project must maintain strict OpSec — separate devices, separate wallets, hardware wallet signing, and the discipline to never click unsolicited links — because social engineering bypasses every technical control. Security is not a feature to add later; it is the architecture itself.