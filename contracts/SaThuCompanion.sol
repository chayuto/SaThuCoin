// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ISaThuCoin} from "./ISaThuCoin.sol";

/// @title SaThuCompanion — Companion router for the immutable SaThuCoin contract.
/// @author SaThuCoin Contributors
/// @notice Extends SaThuCoin with tagged minting events, burn-with-offering,
///         and gasless offerings via EIP-2612 permit. Purely additive — the
///         original SaThuCoin contract is unchanged.
/// @dev Stateless router. No token state — all balances, supply, allowances,
///      and nonces live on SaThuCoin. The companion only emits enhanced events
///      and forwards calls to the original contract.
///      Reentrancy analysis: SaThuCoin has no callback hooks (no ERC-777, no
///      _beforeTokenTransfer). The companion is stateless (no storage to corrupt
///      beyond AccessControl roles). ReentrancyGuard is therefore unnecessary.
/// @custom:security-contact security@sathucoin.example
contract SaThuCompanion is AccessControl, Pausable {

    // ──────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────

    /// @notice Role identifier for accounts that can mint through the companion.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // ──────────────────────────────────────────
    // Immutables
    // ──────────────────────────────────────────

    /// @notice The immutable reference to the deployed SaThuCoin contract.
    ISaThuCoin public immutable sathu;

    // ──────────────────────────────────────────
    // Custom Errors
    // ──────────────────────────────────────────

    /// @notice Thrown when a zero address is passed where a valid address is required.
    error ZeroAddressNotAllowed();

    // ──────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────

    /// @notice Emitted when tokens are minted for a tagged deed via the companion.
    /// @param recipient  The wallet that receives SATHU tokens.
    /// @param sourceId   keccak256 of the source identifier string.
    ///                   Indexed — enables O(1) filtering by charity source.
    /// @param categoryId keccak256 of the category string.
    ///                   Indexed — enables O(1) filtering by deed category.
    /// @param amount     The number of tokens minted (18 decimals).
    /// @param deed       Human-readable deed description (same string
    ///                   passed to SaThuCoin.mintForDeed).
    /// @param source     Plain-text source identifier (e.g., "charity-alpha").
    /// @param category   Plain-text category (e.g., "healthcare").
    event DeedRecorded(
        address indexed recipient,
        bytes32 indexed sourceId,
        bytes32 indexed categoryId,
        uint256 amount,
        string deed,
        string source,
        string category
    );

    /// @notice Emitted when tokens are burned as a voluntary offering.
    /// @param offerer  The wallet that burned the tokens.
    /// @param amount   The number of tokens burned (18 decimals).
    /// @param offering Human-readable offering message, prayer, or dedication.
    event OfferingMade(
        address indexed offerer,
        uint256 amount,
        string offering
    );

    // ──────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────

    /// @notice Deploys the companion contract.
    /// @param sathuAddress The deployed SaThuCoin contract address.
    /// @param admin        Receives DEFAULT_ADMIN_ROLE (can pause, manage roles).
    /// @param minter       Receives MINTER_ROLE (can call mintForDeedTagged).
    constructor(address sathuAddress, address admin, address minter) {
        if (sathuAddress == address(0)) revert ZeroAddressNotAllowed();
        if (admin == address(0)) revert ZeroAddressNotAllowed();
        if (minter == address(0)) revert ZeroAddressNotAllowed();

        sathu = ISaThuCoin(sathuAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, minter);
    }

    // ──────────────────────────────────────────
    // Mint Functions
    // ──────────────────────────────────────────

    /// @notice Mint tokens for a verified deed with source and category tags.
    /// @dev Calls sathu.mintForDeed() then emits DeedRecorded with indexed tags.
    ///      Requires MINTER_ROLE on this companion contract.
    ///      Requires this companion to have MINTER_ROLE on SaThuCoin.
    /// @param to       The recipient address (the donor's wallet).
    /// @param amount   The number of tokens to mint (18 decimals).
    /// @param deed     A short description of the deed (passed to SaThuCoin).
    /// @param source   The source identifier (e.g., "charity-alpha").
    /// @param category The deed category (e.g., "healthcare").
    function mintForDeedTagged(
        address to,
        uint256 amount,
        string calldata deed,
        string calldata source,
        string calldata category
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        sathu.mintForDeed(to, amount, deed);

        emit DeedRecorded(
            to,
            keccak256(bytes(source)),
            keccak256(bytes(category)),
            amount,
            deed,
            source,
            category
        );
    }

    // ──────────────────────────────────────────
    // Burn Functions
    // ──────────────────────────────────────────

    /// @notice Burn tokens as a voluntary offering with an on-chain message.
    /// @dev Caller must have approved this companion via sathu.approve() first.
    ///      Calls sathu.burnFrom() then emits OfferingMade.
    /// @param amount   The number of tokens to burn (18 decimals).
    /// @param offering A human-readable offering message, prayer, or dedication.
    function burnWithOffering(
        uint256 amount,
        string calldata offering
    ) external whenNotPaused {
        sathu.burnFrom(msg.sender, amount);
        emit OfferingMade(msg.sender, amount, offering);
    }

    /// @notice Burn tokens as an offering using EIP-2612 permit for gasless approval.
    /// @dev Single transaction: permit sets allowance, then burnFrom burns.
    ///      The permit call uses try/catch to handle the known front-running
    ///      scenario where an observer submits the permit before the user.
    ///      If the permit was already consumed (front-run or prior approval),
    ///      burnFrom still succeeds if sufficient allowance exists.
    ///      See: OpenZeppelin ERC20Permit security considerations.
    /// @param amount    The number of tokens to burn (18 decimals).
    /// @param offering  A human-readable offering message.
    /// @param deadline  The permit signature expiry timestamp.
    /// @param v         ECDSA signature component.
    /// @param r         ECDSA signature component.
    /// @param s         ECDSA signature component.
    function burnWithOfferingPermit(
        uint256 amount,
        string calldata offering,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused {
        // Try permit — if it was already front-run or the caller has
        // a pre-existing allowance, the catch block absorbs the revert
        // and we proceed to burnFrom which checks allowance independently.
        try sathu.permit(msg.sender, address(this), amount, deadline, v, r, s) {
            // Permit succeeded — allowance is now set.
        } catch {
            // Permit failed (front-run, replay, or prior approval).
            // If no allowance exists, burnFrom will revert below.
        }

        sathu.burnFrom(msg.sender, amount);
        emit OfferingMade(msg.sender, amount, offering);
    }

    // ──────────────────────────────────────────
    // Pause Functions
    // ──────────────────────────────────────────

    /// @notice Pause all companion operations. Only callable by admin.
    /// @dev Does NOT pause SaThuCoin — only this companion.
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpause all companion operations. Only callable by admin.
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
