// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title SaThuCoin (SATHU)
/// @author SaThuCoin Contributors
/// @notice An ERC-20 token on Base chain that rewards charitable donors.
/// @dev Capped supply. All tokens are minted by accounts with MINTER_ROLE in response
///      to verified good deeds. No initial supply — every SATHU represents a verified donation.
///      Uses AccessControl for role separation (admin vs minter vs pauser),
///      ERC20Capped for supply limits, ERC20Pausable for emergency stops,
///      and ERC20Permit for gasless approvals.
/// @custom:security-contact security@sathucoin.example
contract SaThuCoin is ERC20, ERC20Capped, ERC20Pausable, ERC20Permit, AccessControl {

    /// @notice Role identifier for accounts that can mint tokens.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Role identifier for accounts that can pause/unpause the contract.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Maximum tokens mintable in a single transaction (10,000 SATHU).
    uint256 public constant MAX_MINT_PER_TX = 10_000 * 10 ** 18;

    /// @notice Thrown when a mint amount exceeds the per-transaction limit.
    /// @param amount The requested mint amount.
    /// @param maxAllowed The maximum allowed per transaction.
    error MintAmountExceedsLimit(uint256 amount, uint256 maxAllowed);

    /// @notice Emitted when tokens are minted for a verified good deed.
    /// @param recipient The wallet that receives the SATHU tokens.
    /// @param amount The number of tokens minted (in wei, 18 decimals).
    /// @param deed A short description of the deed or the source name.
    event DeedRewarded(
        address indexed recipient,
        uint256 amount,
        string deed
    );

    /// @notice Deploys SaThuCoin with zero initial supply and a 1 billion token cap.
    /// @param admin The address that receives DEFAULT_ADMIN_ROLE (should be a Safe multisig).
    /// @param minter The address that receives MINTER_ROLE (can be a bot EOA or the admin).
    constructor(address admin, address minter)
        ERC20("SaThuCoin", "SATHU")
        ERC20Capped(1_000_000_000 * 10 ** 18)
        ERC20Permit("SaThuCoin")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(PAUSER_ROLE, admin);
    }

    /// @notice Mint tokens to an address. Only callable by MINTER_ROLE when not paused.
    /// @param to The recipient address.
    /// @param amount The number of tokens to mint (in wei, 18 decimals).
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (amount > MAX_MINT_PER_TX) {
            revert MintAmountExceedsLimit(amount, MAX_MINT_PER_TX);
        }
        _mint(to, amount);
    }

    /// @notice Mint tokens for a verified good deed. Emits DeedRewarded event.
    /// @param to The recipient address (the donor's wallet).
    /// @param amount The number of tokens to mint (in wei, 18 decimals).
    /// @param deed A short description of the deed or the source name.
    function mintForDeed(
        address to,
        uint256 amount,
        string calldata deed
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (amount > MAX_MINT_PER_TX) {
            revert MintAmountExceedsLimit(amount, MAX_MINT_PER_TX);
        }
        _mint(to, amount);
        emit DeedRewarded(to, amount, deed);
    }

    /// @notice Pause all token transfers and minting. Only callable by PAUSER_ROLE.
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause all token transfers and minting. Only callable by PAUSER_ROLE.
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @dev Prevents renouncing DEFAULT_ADMIN_ROLE to avoid irrecoverable loss of admin.
    ///      MINTER_ROLE and PAUSER_ROLE can still be renounced normally.
    function renounceRole(bytes32 role, address callerConfirmation) public override {
        if (role == DEFAULT_ADMIN_ROLE) {
            revert("Renounce admin disabled");
        }
        super.renounceRole(role, callerConfirmation);
    }

    /// @dev Required override for ERC20Capped and ERC20Pausable.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Pausable)
    {
        super._update(from, to, value);
    }

    /// @dev Required override for AccessControl + ERC20Permit (both inherit ERC165).
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
