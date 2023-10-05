// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/*
 * @title SourceToken - An ERC20 token contract used for TESTING purposes
 * @notice The SourceToken provides a mint function to mint tokens wihtout any limitations.
 */
contract SourceToken is ERC20Permit {
    constructor(
        string memory tokenName,
        string memory tokenSymbol
    ) ERC20Permit(tokenName) ERC20(tokenName, tokenSymbol) {}

    /*
     * @notice Everyone can mint freely (just for TESTING purposes)
     * @param account Address to get the newly minted tokens.
     * @param amount Amount of tokens to be minted.
     */
    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}
