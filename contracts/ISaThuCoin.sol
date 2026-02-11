// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title ISaThuCoin — Minimal interface for the deployed SaThuCoin contract.
/// @author SaThuCoin Contributors
/// @notice Used by SaThuCompanion to call SaThuCoin's functions via external calls.
/// @dev Signatures MUST match the deployed contract at 0x974FCaC6add872B946917eD932581CA9f7188AbD.
///      Only the functions the companion needs are included.
interface ISaThuCoin {
    /// @notice Mint tokens for a verified good deed.
    /// @param to The recipient address (the donor's wallet).
    /// @param amount The number of tokens to mint (18 decimals).
    /// @param deed A short description of the deed or the source name.
    function mintForDeed(address to, uint256 amount, string calldata deed) external;

    /// @notice Burn tokens from an account with prior allowance.
    /// @param account The account from which tokens will be burned.
    /// @param value The number of tokens to burn (18 decimals).
    function burnFrom(address account, uint256 value) external;

    /// @notice EIP-2612 permit — gasless approval via signature.
    /// @param owner The token owner authorizing the spending.
    /// @param spender The account being granted allowance.
    /// @param value The allowance amount (18 decimals).
    /// @param deadline Unix timestamp after which the signature is invalid.
    /// @param v ECDSA recovery identifier.
    /// @param r ECDSA signature component.
    /// @param s ECDSA signature component.
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}
