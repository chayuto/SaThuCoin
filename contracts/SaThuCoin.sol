// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SaThuCoin (SATHU)
/// @author SaThuCoin Contributors
/// @notice A fictional ERC-20 token that rewards charitable donors.
/// @dev Uncapped supply. All tokens are minted by the owner in response to verified good deeds.
///      No initial supply — every SATHU in existence represents a verified donation.
contract SaThuCoin is ERC20, Ownable {

    /// @notice Emitted when tokens are minted for a verified good deed.
    /// @param recipient The wallet that receives the SATHU tokens.
    /// @param amount The number of tokens minted (in wei, 18 decimals).
    /// @param deed A short description of the deed or the source name.
    event DeedRewarded(
        address indexed recipient,
        uint256 amount,
        string deed
    );

    /// @notice Deploys SaThuCoin with zero initial supply.
    /// @dev Owner is set to msg.sender via OZ Ownable(msg.sender).
    constructor() ERC20("SaThuCoin", "SATHU") Ownable(msg.sender) {
        // No initial mint — supply starts at 0
    }

    /// @notice Mint tokens to an address. Only callable by the owner.
    /// @param to The recipient address.
    /// @param amount The number of tokens to mint (in wei, 18 decimals).
    function mint(address to, uint256 amount) external onlyOwner {
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
    ) external onlyOwner {
        _mint(to, amount);
        emit DeedRewarded(to, amount, deed);
    }
}
