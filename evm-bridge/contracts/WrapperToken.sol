// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/*
 * @title WrapperToken - An ERC20 token contract used to wrap tokens after bridging them.
 * @notice The WrapperToken provides mint and burn functions to be used from the Bridge to allow claiming and releasing
 */
contract WrapperToken is ERC20, Ownable {
    constructor(
        string memory tokenName,
        string memory tokenSymbol
    ) ERC20(tokenName, tokenSymbol) {}

    /*
     * @notice Only the owner can mint tokens (the owner is supposed to be a Bridge)
     * @param account Address to get the newly minted tokens.
     * @param amount Amount of tokens to be minted.
     */
    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }

    /*
     * @notice Only the owner can burn tokens (the owner is supposed to be a Bridge)
     * @param account Address which tokens to burn.
     * @param amount Amount of tokens to be burnt.
     */
    function burn(address account, uint256 amount) public onlyOwner {
        _burn(account, amount);
    }
}
