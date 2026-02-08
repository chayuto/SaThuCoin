# SaThuCoin Incident Response Plan

> Playbooks for responding to security incidents affecting the SaThuCoin contract.

---

## Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| **CRITICAL** | Admin key compromised, contract exploit | Immediate |
| **HIGH** | Minter key compromised, unauthorized minting | < 1 hour |
| **MEDIUM** | Suspicious activity, failed mint attempts | < 4 hours |
| **LOW** | Configuration issues, monitoring alerts | < 24 hours |

---

## Playbook 1: Minter Key Compromised (HIGH)

**Blast radius:** Attacker can mint up to MAX_MINT_PER_TX (10,000 SATHU) per transaction until stopped.

### Immediate Actions

1. **Pause the contract** via Safe multisig:
   - Call `pause()` using the PAUSER_ROLE account
   - This stops ALL minting and transfers immediately

2. **Revoke the compromised minter:**
   - Call `revokeRole(MINTER_ROLE, compromisedAddress)` via Safe multisig

3. **Assess damage:**
   - Check recent `Transfer` events from zero address (mints)
   - Calculate unauthorized tokens minted
   - Identify recipient addresses

### Recovery

1. Generate new minter EOA (new private key)
2. Grant MINTER_ROLE to new minter via Safe multisig
3. Unpause the contract
4. Monitor for further suspicious activity

### Post-incident

- Investigate how the key was compromised
- Review key storage practices
- Consider reducing MAX_MINT_PER_TX if needed (requires contract upgrade)

---

## Playbook 2: Admin Key Compromised (CRITICAL)

**Blast radius:** Attacker can grant/revoke any role, pause/unpause, and effectively take full control.

### Immediate Actions

1. **If Safe multisig:** Attacker needs multiple signers. Contact all signers immediately to:
   - NOT sign any pending transactions from unknown sources
   - Change their individual signer keys if possible

2. **If single admin EOA:** The contract may be lost. The `renounceRole` override prevents accidentally *giving up* admin access, but it does NOT prevent an attacker who holds the key from granting admin to their own addresses or revoking it from others.

### Recovery (Safe multisig)

1. Use remaining signers to revoke attacker's access
2. Rotate all signer keys
3. Review and revoke any unauthorized role grants

### Prevention

- Always use a Safe multisig for DEFAULT_ADMIN_ROLE
- Use 2-of-3 or 3-of-5 signing threshold
- Store signer keys on hardware wallets
- Never reuse keys across projects

---

## Playbook 3: Unauthorized Minting Detected (HIGH)

**Indicators:** Unexpected Transfer events from zero address, supply increase without corresponding deed.

### Investigation

1. Query recent mint events:
   ```
   DeedRewarded(recipient, amount, deed)
   Transfer(address(0), recipient, amount)
   ```

2. Cross-reference with authorized mint operations
3. Check if minter account transaction history shows unexpected activity

### Response

1. If minter key compromised: Follow Playbook 1
2. If authorized minter made an error: No contract action needed, investigate process
3. If contract exploit: Pause immediately, engage security auditors

---

## Playbook 4: Contract Paused Unexpectedly (MEDIUM)

### Investigation

1. Check who called `pause()` — only PAUSER_ROLE accounts can do this
2. Check recent `Paused` events on BaseScan
3. Contact PAUSER_ROLE holders

### Response

1. If intentional pause: Document reason, communicate to users
2. If unauthorized: Follow Playbook 2 (admin compromise)
3. To resume: Call `unpause()` via PAUSER_ROLE account

---

## Monitoring Recommendations

- Watch for `RoleGranted` / `RoleRevoked` events (unexpected role changes)
- Watch for `Paused` / `Unpaused` events
- Monitor minting frequency and amounts
- Set up alerts for mints exceeding expected patterns
- Monitor total supply growth rate

---

## Contact

- Security contact: security@sathucoin.example
- Safe multisig signers: [document offline, not in repo]
