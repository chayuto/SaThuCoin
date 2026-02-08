# SaThuCoin — Complete Names & Claims Checklist

> **Purpose**: Every name, handle, domain, on-chain identity, and legal claim the SaThuCoin project should secure. Organized by priority with step-by-step instructions, costs, and links.
>
> **Status key**: ⬜ Not started | 🟡 In progress | ✅ Done

---

## TIER 1 — CRITICAL (Do These First)

These are irreversible first-mover claims. If someone else grabs them, you can't get them back without negotiating or paying a premium.

---

### 1.1 ENS Domains (.eth) — Ethereum Name Service

**What**: Human-readable names anchored on Ethereum L1 that resolve to your wallet address across ALL EVM chains. The gold standard of on-chain identity. Each ENS name is an ERC-721 NFT you own.

**Register at**: https://app.ens.domains

**Requirements**: MetaMask or any Web3 wallet + ETH on Ethereum mainnet

| # | Name | Characters | Annual Cost | Priority | Status |
|---|------|-----------|-------------|----------|--------|
| 1 | `sathu.eth` | 5 | $5/year + gas | 🔴 Critical | ⬜ |
| 2 | `sathucoin.eth` | 9 | $5/year + gas | 🔴 Critical | ⬜ |

**Steps**:
1. Go to https://app.ens.domains
2. Connect your wallet (use the wallet that will be your project's primary identity)
3. Search for `sathu.eth` — check availability
4. Select registration period (recommend 3+ years to avoid losing it)
5. Complete the two-step registration process (commit → wait 60 seconds → register)
6. Repeat for `sathucoin.eth`
7. Set resolver records: link your Base wallet address, add avatar, description, URL
8. Set one as your "Primary ENS Name" so it displays in wallets and dApps

**Post-registration setup**:
- ⬜ Set ETH address record (your main wallet)
- ⬜ Set Base address record (your project wallet on Base)
- ⬜ Set avatar (upload project logo as NFT or use IPFS link)
- ⬜ Set description: "Charity donation recognition token on Base"
- ⬜ Set URL: sathucoin.com (once registered)
- ⬜ Set Twitter/X handle record
- ⬜ Create subdomains later: `donate.sathucoin.eth`, `treasury.sathucoin.eth`, `admin.sathucoin.eth`

**Cost estimate**: ~$10/year + ~$5-15 gas (depends on Ethereum gas prices)

**Tips**:
- Register during low gas periods (weekends, early UTC mornings)
- Set calendar reminders to renew before expiry
- Consider enabling auto-renewal or registering for 5+ years

---

### 1.2 Basenames (.base.eth) — Base Chain Native Identity

**What**: On-chain names built on ENS infrastructure but deployed natively on Base. Much cheaper gas than ENS L1. This is your project's home-chain identity since SaThuCoin deploys on Base.

**Register at**: https://www.base.org/names

**Requirements**: Wallet + ETH on Base chain

| # | Name | Annual Cost | Priority | Status |
|---|------|-------------|----------|--------|
| 3 | `sathucoin.base.eth` | ~$2-5 | 🔴 Critical | ⬜ |
| 4 | `sathu.base.eth` | ~$2-5 | 🔴 Critical | ⬜ |

**Steps**:
1. Go to https://www.base.org/names
2. Connect your wallet (ensure you're on Base network)
3. Bridge ETH to Base if needed (use https://bridge.base.org)
4. Search for `sathucoin` — check availability
5. Select registration period
6. Complete registration (single transaction, very cheap on Base)
7. Set as your primary name on Base

**Post-registration setup**:
- ⬜ Set as primary name for your project wallet
- ⬜ Link to your ENS name for cross-chain resolution
- ⬜ Add profile info (avatar, description, links)

**Cost estimate**: ~$4-10 total + sub-cent gas on Base

**Tips**:
- Basenames work across any EVM chain via ENSIP-10
- You may qualify for a free 5+ letter name if you meet certain criteria (check the site)

---

### 1.3 Token Contract Deployment — Claiming the SATHU Ticker

**What**: Deploying the ERC-20 contract permanently registers the token name "SaThuCoin" and symbol "SATHU" on-chain. There is no central ticker registry in crypto — deployment IS the claim.

| # | Action | Network | Priority | Status |
|---|--------|---------|----------|--------|
| 5 | Deploy SaThuCoin contract | Base Sepolia (testnet) | 🔴 Critical | ⬜ |
| 6 | Verify contract source code | BaseScan Sepolia | 🔴 Critical | ⬜ |
| 7 | Deploy SaThuCoin contract | Base Mainnet | 🔴 Critical | ⬜ |
| 8 | Verify contract source code | BaseScan Mainnet | 🔴 Critical | ⬜ |

**Contract parameters to lock in**:
```
Name:   "SaThuCoin"
Symbol: "SATHU"
Chain:  Base (chainId 8453)
```

**Steps (Testnet first)**:
1. Complete Phase 1 build (Hardhat project with contract + tests)
2. Deploy to Base Sepolia using deployment script
3. Verify on BaseScan Sepolia: `npx hardhat verify --network baseSepolia <address>`
4. Test all functions (mint, pause, role management)
5. When satisfied, deploy to Base Mainnet
6. Verify on BaseScan Mainnet

**Post-deployment**:
- ⬜ Record contract address in all project documentation
- ⬜ Transfer DEFAULT_ADMIN_ROLE to Safe multisig
- ⬜ Link contract address to your ENS and Basename
- ⬜ Claim BaseScan token info page (see 2.5)

**Cost estimate**: ~$0.01-0.05 on Base (gas is extremely cheap)

**Important**: The ticker "SATHU" is NOT currently used by any token on CoinMarketCap, CoinGecko, or any major exchange. "SATT" IS taken (by SaTT advertising token). "SATS" IS taken (by Satoshi). Your chosen symbol is clear.

---

### 1.4 Web Domains — Traditional DNS

**What**: Standard internet domains for your project website, documentation, and email.

**Register at**: Namecheap, Cloudflare, GoDaddy, or Porkbun

| # | Domain | Est. Cost/Year | Priority | Status |
|---|--------|---------------|----------|--------|
| 9 | `sathucoin.com` | $10-15 | 🔴 Critical | ⬜ |
| 10 | `sathucoin.org` | $10-12 | 🟠 High | ⬜ |
| 11 | `sathu.io` | $30-50 | 🟠 High | ⬜ |
| 12 | `sathucoin.xyz` | $10-12 | 🟡 Medium | ⬜ |
| 13 | `sathucoin.app` | $15-20 | 🟡 Medium | ⬜ |
| 14 | `sathu.xyz` | $10-12 | 🟡 Medium | ⬜ |
| 15 | `sathucoin.net` | $10-12 | 🔵 Low | ⬜ |

**Steps**:
1. Search for availability on your preferred registrar
2. Register `.com` first — this is the canonical web domain
3. Add `.org` for credibility (charity/community project)
4. Add `.io` as the crypto-ecosystem standard
5. Enable WHOIS privacy protection on all domains
6. Enable auto-renewal to prevent accidental expiry
7. Point all secondary domains to redirect to `sathucoin.com`

**Post-registration**:
- ⬜ Set up DNS records
- ⬜ Configure email: `contact@sathucoin.com`, `security@sathucoin.com`
- ⬜ Deploy a simple landing page (even a "coming soon" page establishes presence)
- ⬜ Link domain in ENS records

**Cost estimate**: ~$50-100/year for core domains

---

### 1.5 Social Media Handles

**What**: Username reservations across platforms. Even if you don't plan to post immediately, securing the handles prevents squatters.

| # | Platform | Handle | Link | Priority | Status |
|---|----------|--------|------|----------|--------|
| 16 | X (Twitter) | `@sathucoin` | https://x.com | 🔴 Critical | ⬜ |
| 17 | GitHub | `sathucoin` | https://github.com | 🔴 Critical | ⬜ |
| 18 | Telegram | `t.me/sathucoin` | https://t.me | 🟠 High | ⬜ |
| 19 | Discord | Server: "SaThuCoin" | https://discord.com | 🟠 High | ⬜ |
| 20 | Reddit | `r/sathucoin` | https://reddit.com | 🟡 Medium | ⬜ |
| 21 | LinkedIn | Company: "SaThuCoin" | https://linkedin.com | 🟡 Medium | ⬜ |
| 22 | YouTube | `@sathucoin` | https://youtube.com | 🟡 Medium | ⬜ |
| 23 | Medium | `@sathucoin` | https://medium.com | 🔵 Low | ⬜ |
| 24 | Mirror.xyz | `sathucoin.mirror.xyz` | https://mirror.xyz | 🔵 Low | ⬜ |

**Steps**:
1. Create accounts using a dedicated project email (`contact@sathucoin.com`)
2. Use a password manager — generate unique passwords for each
3. Enable 2FA on every account (hardware key preferred, authenticator app minimum)
4. Add consistent bio/description across all platforms
5. Upload project logo as profile picture on all platforms
6. On GitHub: create the `sathucoin` organization (not just a user account)

**Suggested bio** (adapt per platform):
> SaThuCoin (SATHU) — Recognizing charitable giving on Base chain. A reputation token rewarding verified donors. 🔗 sathucoin.com

**Cost**: Free (all platforms)

---

## TIER 2 — HIGH PRIORITY (Do Within First Week)

---

### 2.1 Farcaster Account — On-Chain Social Identity

**What**: Farcaster is a decentralized social protocol deeply integrated with the Base ecosystem. The Base community lives here. Your Farcaster ID (FID) is registered on-chain on Optimism. This is non-negotiable for a Base project.

| # | Action | Cost | Priority | Status |
|---|--------|------|----------|--------|
| 25 | Register Farcaster account `@sathucoin` | ~$7 in ETH | 🟠 High | ⬜ |
| 26 | Set up Warpcast profile | Free | 🟠 High | ⬜ |
| 27 | Connect Base wallet to Farcaster | Free | 🟠 High | ⬜ |

**Steps**:
1. Download Warpcast (iOS or Android) — https://warpcast.com
2. Create account with your project wallet
3. Claim username `sathucoin`
4. Complete profile: avatar, bio, link to website
5. Connect your Base wallet for on-chain verification
6. Follow key Base ecosystem accounts
7. Post an introductory cast about the project

**Why this matters**:
- Farcaster Frames let you embed interactive mint buttons directly in posts
- The Base builder community communicates primarily through Farcaster
- Your FID is on-chain — it's verifiable identity, not just a social account

---

### 2.2 Unstoppable Domains — Permanent On-Chain Domains

**What**: Blockchain domains minted as NFTs on Polygon/Base. One-time purchase, no renewals ever. You own them permanently like any other NFT.

**Register at**: https://unstoppabledomains.com

| # | Domain | Est. Cost (one-time) | Priority | Status |
|---|--------|---------------------|----------|--------|
| 28 | `sathucoin.crypto` | $10-20 | 🟡 Medium | ⬜ |
| 29 | `sathucoin.wallet` | $10-20 | 🟡 Medium | ⬜ |
| 30 | `sathucoin.nft` | $10-20 | 🔵 Low | ⬜ |
| 31 | `sathucoin.blockchain` | $10-20 | 🔵 Low | ⬜ |
| 32 | `sathu.x` | $20-40 | 🔵 Low | ⬜ |

**Steps**:
1. Go to https://unstoppabledomains.com
2. Search for desired names
3. Purchase (credit card or crypto accepted)
4. Mint the domain NFT to your wallet
5. Set crypto address records (ETH, Base, etc.)

**Cost estimate**: ~$40-80 one-time for core names, never again

---

### 2.3 Safe Multisig Wallet — On-Chain Governance Identity

**What**: A multi-signature wallet on Base that serves as the project's admin/governance address. This is both a security measure (from your security doc) and an on-chain identity anchor.

| # | Action | Cost | Priority | Status |
|---|--------|------|----------|--------|
| 33 | Deploy Safe multisig on Base | Gas (~$0.01) | 🟠 High | ⬜ |
| 34 | Register Basename for Safe: `admin.sathucoin.base.eth` | ~$2 | 🟡 Medium | ⬜ |

**Steps**:
1. Go to https://app.safe.global
2. Connect your wallet on Base network
3. Create a new Safe with 2-of-3 threshold (recommended)
4. Add signer addresses (your hardware wallet + backup addresses)
5. Record the Safe address in project documentation
6. After contract deployment, transfer DEFAULT_ADMIN_ROLE to this Safe
7. Optionally register a Basename for the Safe address

---

### 2.4 GitHub Organization & Repository

**What**: The open-source home for SaThuCoin code. A GitHub Organization (not just a user account) gives you team management, multiple repos, and professional presence.

| # | Action | Cost | Priority | Status |
|---|--------|------|----------|--------|
| 35 | Create GitHub org: `sathucoin` | Free | 🟠 High | ⬜ |
| 36 | Create main repo: `sathucoin/sathucoin` | Free | 🟠 High | ⬜ |
| 37 | Add SECURITY.md | Free | 🟠 High | ⬜ |
| 38 | Add LICENSE (MIT) | Free | 🟠 High | ⬜ |
| 39 | Enable branch protection | Free | 🟠 High | ⬜ |
| 40 | Enable Secret Scanning | Free | 🟠 High | ⬜ |
| 41 | Enable Dependabot alerts | Free | 🟠 High | ⬜ |

**Steps**:
1. Go to https://github.com/organizations/plan
2. Create free organization named `sathucoin`
3. Create repository `sathucoin` (the main monorepo)
4. Add README.md with project description, logo, links
5. Add SECURITY.md with responsible disclosure policy
6. Add LICENSE (MIT recommended)
7. Enable all security features in Settings → Code security
8. Set up branch protection on `main` branch
9. Add `.gitignore` that excludes `.env`, `node_modules`, etc.
10. Add pre-commit hooks with `git-secrets` to prevent key leaks

---

### 2.5 BaseScan Token Info Page

**What**: After deploying and verifying your contract on Base mainnet, you can claim the token information page on BaseScan. This is what everyone sees when they look up SATHU.

| # | Action | Cost | Priority | Status |
|---|--------|------|----------|--------|
| 42 | Verify contract on BaseScan | Free | 🟠 High (post-deploy) | ⬜ |
| 43 | Submit token info update | Free | 🟠 High (post-deploy) | ⬜ |

**Steps** (after mainnet deployment):
1. Go to https://basescan.org/address/<your-contract-address>
2. Click "Verify & Publish" → follow verification flow
3. Once verified, go to the token page
4. Click "Update Token Information"
5. Submit: project name, logo (256×256 PNG), website, description, social links, email
6. Sign a message from the deployer/owner wallet to prove ownership
7. Wait for BaseScan team review (usually 1-3 business days)

**Information to prepare**:
- ⬜ Project logo: 256×256 PNG with transparent background
- ⬜ Project description: 2-3 sentences
- ⬜ Website URL: sathucoin.com
- ⬜ Social links: X, GitHub, Telegram, Discord
- ⬜ Contact email: contact@sathucoin.com

---

## TIER 3 — MEDIUM PRIORITY (Do Within First Month)

---

### 3.1 Token Listing Applications

**What**: Getting SATHU listed on token tracking and data aggregation sites so people can find price, market cap, and project info.

| # | Platform | When to Apply | Cost | Status |
|---|----------|--------------|------|--------|
| 44 | CoinGecko | After mainnet deploy + some activity | Free | ⬜ |
| 45 | CoinMarketCap | After mainnet deploy + some activity | Free | ⬜ |
| 46 | DexScreener | Auto-listed if on DEX | Free | ⬜ |
| 47 | DEXTools | Auto-listed if on DEX | Free | ⬜ |
| 48 | GeckoTerminal | Auto-listed if on DEX | Free | ⬜ |

**CoinGecko application** (https://www.coingecko.com/en/coins/list/new):
- Requires: deployed contract, verified source, project website, working product
- Processing time: 2-4 weeks

**CoinMarketCap application** (https://support.coinmarketcap.com):
- Requires: deployed contract, exchange/DEX listing, trading volume
- Processing time: 2-8 weeks
- More stringent requirements than CoinGecko

**Note**: DEX aggregators (DexScreener, DEXTools, GeckoTerminal) auto-detect new tokens once there's a liquidity pool. No application needed.

---

### 3.2 Ethereum Attestation Service (EAS)

**What**: On-chain attestations that create verifiable claims about your project and its participants. Can be used to build trust infrastructure for verified good deeds.

| # | Action | Cost | Priority | Status |
|---|--------|------|----------|--------|
| 49 | Create attestation schema for verified donors | Gas | 🟡 Medium | ⬜ |
| 50 | Create project identity attestation | Gas | 🟡 Medium | ⬜ |

**Register at**: https://base.easscan.org

**Steps**:
1. Go to https://base.easscan.org
2. Connect your project wallet
3. Create a schema: e.g., `address donorAddress, uint256 donationAmount, string charityName, uint256 timestamp`
4. Register the schema on-chain
5. Use the schema to attest to verified donations alongside SATHU minting

**Future use cases**:
- Attestations for charity verification
- Donor reputation scoring
- Cross-project interoperability (other dApps can read your attestations)

---

### 3.3 Base Ecosystem Directory

**What**: Getting listed in Base's official ecosystem directory increases visibility among Base users and developers.

| # | Action | Cost | Priority | Status |
|---|--------|------|----------|--------|
| 51 | Submit to Base ecosystem directory | Free | 🟡 Medium | ⬜ |
| 52 | Apply for Base Builder grants (if applicable) | Free | 🟡 Medium | ⬜ |

**Steps**:
1. Check https://base.org/ecosystem for submission process
2. Prepare project info: description, logo, links, contract address
3. Submit application
4. Engage with Base community on Farcaster to build visibility

---

### 3.4 Mirror.xyz Publication

**What**: Mirror is a decentralized publishing platform on Ethereum. Creates permanent, on-chain articles. Good for project announcements and documentation.

| # | Action | Cost | Priority | Status |
|---|--------|------|----------|--------|
| 53 | Claim `sathucoin.mirror.xyz` | Free | 🔵 Low | ⬜ |
| 54 | Publish project introduction article | Gas (optional) | 🔵 Low | ⬜ |

---

### 3.5 BNS — Base Name Service (.bns)

**What**: Alternative name service on Base. Less established than Basenames but permanent (one-time payment).

| # | Name | Cost (one-time) | Priority | Status |
|---|------|-----------------|----------|--------|
| 55 | `sathucoin.bns` | 0.0025 ETH | 🔵 Low | ⬜ |
| 56 | `sathu.bns` | 0.0025 ETH | 🔵 Low | ⬜ |

**Register at**: https://basename.domains

---

### 3.6 Lens Protocol Handle

**What**: Decentralized social protocol where profiles are NFTs. Growing cross-chain social graph.

| # | Action | Cost | Priority | Status |
|---|--------|------|----------|--------|
| 57 | Claim `@sathucoin` on Lens | Gas | 🔵 Low | ⬜ |

---

## TIER 4 — LEGAL PROTECTION (Do Within First 3 Months)

---

### 4.1 Trademark Registration

**What**: Legal protection for the "SaThuCoin" and "SATHU" brand names. Cryptocurrency tokens themselves can't be directly trademarked, but the services around them can be.

| # | Action | Jurisdiction | Est. Cost | Priority | Status |
|---|--------|-------------|-----------|----------|--------|
| 58 | Search USPTO TESS database for conflicts | US | Free | 🟠 High | ⬜ |
| 59 | Search IP Australia database for conflicts | Australia | Free | 🟠 High | ⬜ |
| 60 | File TM application — IP Australia | Australia | A$250/class | 🟡 Medium | ⬜ |
| 61 | File TM application — USPTO (TEAS Plus) | United States | US$250-350/class | 🟡 Medium | ⬜ |

**Recommended trademark classes**:

**Class 9** — Downloadable computer software; digital tokens; blockchain-based software applications; downloadable digital assets authenticated by non-fungible tokens
- Covers: The token itself as downloadable software, the minter application, any apps

**Class 36** — Financial services; cryptocurrency services, namely providing a virtual currency for use by members of an online community via a global computer network; digital token exchange services
- Covers: The core service of providing SATHU tokens for charity recognition

**Class 42** — Software as a service (SaaS); design and development of blockchain-based software; technological consulting in the field of cryptocurrency and blockchain
- Covers: The scraper/minter platform, any future web services

**Steps (IP Australia)**:
1. Search https://search.ipaustralia.gov.au/trademarks/search/quick for "SATHU" and "SATHUCOIN"
2. If clear, file at https://www.ipaustralia.gov.au/trade-marks/applying-for-a-trade-mark
3. Select classes (minimum Class 9 + 36)
4. Provide specimen of use (screenshot of deployed contract, website, etc.)
5. Processing time: 4-8 months

**Steps (USPTO)**:
1. Search https://tmsearch.uspto.gov for conflicts
2. File via TEAS Plus at https://www.uspto.gov/trademarks/apply
3. Select classes (same as above)
4. Can file "Intent to Use" before launch, convert to "Use in Commerce" after
5. Processing time: 8-12 months

**Immediate free protection**:
- Begin using ™ symbol now: SaThuCoin™, SATHU™
- This establishes common law trademark rights through use
- Switch to ® only after official registration is granted
- Use consistently with generic descriptor: "SATHU digital token" or "SaThuCoin charity recognition platform"

**Cost estimate**: A$500-750 (2-3 classes in Australia) + US$500-1050 (2-3 classes in US)

---

### 4.2 Brand Usage Guidelines

**What**: A document establishing how the SaThuCoin brand should and shouldn't be used. Protects against dilution and misrepresentation.

| # | Action | Cost | Priority | Status |
|---|--------|------|----------|--------|
| 62 | Create brand guidelines document | Free | 🟡 Medium | ⬜ |
| 63 | Create official logo files (SVG, PNG) | Free | 🟡 Medium | ⬜ |
| 64 | Publish brand assets on GitHub | Free | 🟡 Medium | ⬜ |

**Brand guidelines should cover**:
- Official name spelling: "SaThuCoin" (capital S, T, C)
- Official ticker: "SATHU" (all caps)
- Logo usage rules (minimum size, clear space, color variations)
- Prohibited uses (don't modify logo, don't use in misleading ways)
- Color palette, typography
- Tone of voice

---

## COMPLETE MASTER CHECKLIST

Quick reference of all 64 items:

### On-Chain Identity
- ⬜ 1. `sathu.eth` (ENS)
- ⬜ 2. `sathucoin.eth` (ENS)
- ⬜ 3. `sathucoin.base.eth` (Basenames)
- ⬜ 4. `sathu.base.eth` (Basenames)
- ⬜ 5. Deploy SATHU contract — Base Sepolia
- ⬜ 6. Verify contract — BaseScan Sepolia
- ⬜ 7. Deploy SATHU contract — Base Mainnet
- ⬜ 8. Verify contract — BaseScan Mainnet
- ⬜ 25. Farcaster `@sathucoin`
- ⬜ 28. `sathucoin.crypto` (Unstoppable Domains)
- ⬜ 29. `sathucoin.wallet` (Unstoppable Domains)
- ⬜ 30. `sathucoin.nft` (Unstoppable Domains)
- ⬜ 31. `sathucoin.blockchain` (Unstoppable Domains)
- ⬜ 32. `sathu.x` (Unstoppable Domains)
- ⬜ 33. Safe multisig on Base
- ⬜ 34. `admin.sathucoin.base.eth` (Basename for Safe)
- ⬜ 42. BaseScan contract verification
- ⬜ 43. BaseScan token info page
- ⬜ 49. EAS attestation schema
- ⬜ 50. EAS project identity attestation
- ⬜ 55. `sathucoin.bns` (BNS)
- ⬜ 56. `sathu.bns` (BNS)
- ⬜ 57. Lens `@sathucoin`

### Web Domains
- ⬜ 9. `sathucoin.com`
- ⬜ 10. `sathucoin.org`
- ⬜ 11. `sathu.io`
- ⬜ 12. `sathucoin.xyz`
- ⬜ 13. `sathucoin.app`
- ⬜ 14. `sathu.xyz`
- ⬜ 15. `sathucoin.net`

### Social Media
- ⬜ 16. X/Twitter `@sathucoin`
- ⬜ 17. GitHub org `sathucoin`
- ⬜ 18. Telegram `t.me/sathucoin`
- ⬜ 19. Discord server "SaThuCoin"
- ⬜ 20. Reddit `r/sathucoin`
- ⬜ 21. LinkedIn company page
- ⬜ 22. YouTube `@sathucoin`
- ⬜ 23. Medium `@sathucoin`
- ⬜ 24. Mirror.xyz `sathucoin.mirror.xyz`
- ⬜ 26. Warpcast (Farcaster) profile setup
- ⬜ 27. Connect Base wallet to Farcaster

### GitHub / Code
- ⬜ 35. GitHub organization created
- ⬜ 36. Main repository created
- ⬜ 37. SECURITY.md added
- ⬜ 38. LICENSE (MIT) added
- ⬜ 39. Branch protection enabled
- ⬜ 40. Secret Scanning enabled
- ⬜ 41. Dependabot alerts enabled

### Ecosystem Listings
- ⬜ 44. CoinGecko listing
- ⬜ 45. CoinMarketCap listing
- ⬜ 46. DexScreener (auto on DEX listing)
- ⬜ 47. DEXTools (auto on DEX listing)
- ⬜ 48. GeckoTerminal (auto on DEX listing)
- ⬜ 51. Base ecosystem directory
- ⬜ 52. Base Builder grants
- ⬜ 53. Mirror.xyz publication
- ⬜ 54. First Mirror article published

### Legal / Trademark
- ⬜ 58. USPTO TESS search
- ⬜ 59. IP Australia search
- ⬜ 60. IP Australia TM application
- ⬜ 61. USPTO TM application
- ⬜ 62. Brand guidelines document
- ⬜ 63. Official logo files created
- ⬜ 64. Brand assets published on GitHub

---

## COST SUMMARY

| Category | Items | Est. Cost | Recurring? |
|----------|-------|-----------|------------|
| ENS domains (2) | sathu.eth, sathucoin.eth | ~$15 | Annual |
| Basenames (2) | sathucoin.base.eth, sathu.base.eth | ~$5 | Annual |
| Unstoppable Domains (5) | .crypto, .wallet, .nft, .blockchain, .x | ~$60-100 | Never (one-time) |
| BNS (2) | sathucoin.bns, sathu.bns | ~$15 | Never (one-time) |
| Web domains (4-7) | .com, .org, .io, .xyz | ~$60-120 | Annual |
| Farcaster | @sathucoin | ~$7 | Annual (storage) |
| Contract deployment | Base Sepolia + Mainnet | ~$0.10 | Never |
| Safe multisig | Base | ~$0.01 | Never |
| Social media | All platforms | Free | Never |
| GitHub | Organization + repo | Free | Never |
| BaseScan | Verification + token info | Free | Never |
| Ecosystem listings | CoinGecko, CMC, Base dir | Free | Never |
| EAS attestations | Schemas + attestations | ~$0.10 | Per attestation |
| Trademark (AU) | 2-3 classes | A$500-750 | Renewal every 10 years |
| Trademark (US) | 2-3 classes | US$500-1050 | Renewal every 10 years |

**Total upfront (excluding trademarks)**: ~$160-270
**Total annual recurring**: ~$80-140
**Total with trademarks**: ~$1,200-2,000

---

## PRIORITY SEQUENCE — WHAT TO DO IN WHAT ORDER

### Day 1 (Today)
1. ⬜ Register `sathucoin.com` web domain
2. ⬜ Create X/Twitter `@sathucoin`
3. ⬜ Create GitHub org `sathucoin`
4. ⬜ Create Telegram group `t.me/sathucoin`
5. ⬜ Create Discord server

### Day 2-3
6. ⬜ Register `sathu.eth` and `sathucoin.eth` on ENS
7. ⬜ Register `sathucoin.base.eth` and `sathu.base.eth` on Basenames
8. ⬜ Register Farcaster `@sathucoin` on Warpcast
9. ⬜ Register additional web domains (.org, .io)

### Week 1
10. ⬜ Set up GitHub repository with README, LICENSE, SECURITY.md
11. ⬜ Enable all GitHub security features
12. ⬜ Deploy Safe multisig on Base
13. ⬜ Register Unstoppable Domains (.crypto, .wallet)
14. ⬜ Set up all remaining social media accounts
15. ⬜ Create project logo and brand assets

### Week 2-4
16. ⬜ Deploy contract to Base Sepolia testnet
17. ⬜ Verify on BaseScan Sepolia
18. ⬜ Test thoroughly
19. ⬜ Deploy to Base Mainnet
20. ⬜ Verify on BaseScan Mainnet
21. ⬜ Claim BaseScan token info page
22. ⬜ Transfer admin role to Safe multisig
23. ⬜ Search trademark databases for conflicts

### Month 2-3
24. ⬜ File trademark applications (AU + US)
25. ⬜ Apply for CoinGecko listing
26. ⬜ Apply for CoinMarketCap listing
27. ⬜ Submit to Base ecosystem directory
28. ⬜ Create EAS attestation schemas
29. ⬜ Publish project introduction on Mirror.xyz
30. ⬜ Create and publish brand guidelines

---

## NAMING CONSISTENCY RULES

Use these exact spellings everywhere, always:

| Context | Format | Example |
|---------|--------|---------|
| Full project name | SaThuCoin | "Welcome to SaThuCoin" |
| Token symbol/ticker | SATHU | "Buy 100 SATHU" |
| In code (contract) | "SaThuCoin" / "SATHU" | `ERC20("SaThuCoin", "SATHU")` |
| Hashtags | #SaThuCoin #SATHU | Twitter posts |
| URL/slug | sathucoin (lowercase) | sathucoin.com, @sathucoin |
| ENS | sathucoin.eth (lowercase) | On-chain names |
| With descriptor | SaThuCoin™ digital token | Formal/legal contexts |
| Generic reference | the SATHU token | Conversational |

**Never**: "Sathu Coin" (two words), "SathuCoin" (missing capital T), "saThuCoin" (wrong capitalization), "STU" (wrong ticker)

---

## SECURITY REMINDERS FOR NAME REGISTRATION

- **Use a dedicated email** for all project accounts: `contact@sathucoin.com`
- **Use a password manager** with unique passwords per service
- **Enable 2FA everywhere** — hardware key > authenticator app > SMS
- **Never use the same wallet** for name registration and personal funds
- **Record all registration details** in a secure, encrypted document
- **Set calendar reminders** for all renewals (ENS, Basenames, domains)
- **Enable auto-renewal** where available to prevent accidental expiry
- **Keep seed phrases offline** — never in cloud storage, email, or screenshots
- **Verify URLs carefully** when registering — phishing sites mimic ENS, Basenames, etc.

---

*Document version: 1.0 — Created February 2026*
*Associated project documents: AGENT_PHASE1_INSTRUCTION.md, SATHUCOIN_AI_CODING_GUIDE.md, SATHUCOIN_SECURITY_DEEP_DIVE.md*
