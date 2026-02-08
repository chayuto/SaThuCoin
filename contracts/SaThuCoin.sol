// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title SaThuCoin (SATHU)
/// @author SaThuCoin Contributors
/// @notice An ERC-20 token on Base chain that rewards charitable donors.
/// @dev Capped supply. All tokens are minted by the owner in response to verified good deeds.
///      No initial supply — every SATHU in existence represents a verified donation.
///      Uses Ownable2Step for safe ownership transfers, ERC20Capped for supply limits,
///      ERC20Pausable for emergency stops, and ERC20Permit for gasless approvals.
/// @custom:security-contact security@sathucoin.example
contract SaThuCoin is ERC20, ERC20Capped, ERC20Pausable, ERC20Permit, Ownable2Step {

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
    /// @dev Owner is set to msg.sender via OZ Ownable2Step. Cap is 1 billion tokens.
    constructor()
        ERC20("SaThuCoin", "SATHU")
        ERC20Capped(1_000_000_000 * 10 ** 18)
        ERC20Permit("SaThuCoin")
        Ownable(msg.sender)
    {
        // No initial mint — supply starts at 0
    }

    /// @notice Mint tokens to an address. Only callable by the owner.
    /// @param to The recipient address.
    /// @param amount The number of tokens to mint (in wei, 18 decimals).
    function mint(address to, uint256 amount) external onlyOwner whenNotPaused {
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
    ) external onlyOwner whenNotPaused {
        if (amount > MAX_MINT_PER_TX) {
            revert MintAmountExceedsLimit(amount, MAX_MINT_PER_TX);
        }
        _mint(to, amount);
        emit DeedRewarded(to, amount, deed);
    }

    /// @notice Pause all token transfers and minting. Only callable by the owner.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause all token transfers and minting. Only callable by the owner.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev Disabled to prevent accidental irrecoverable loss of all contract functionality.
    ///      Use transferOwnership() + acceptOwnership() for ownership changes.
    function renounceOwnership() public pure override {
        revert("Renounce disabled");
    }

    /// @dev Required override for ERC20Capped and ERC20Pausable.
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
