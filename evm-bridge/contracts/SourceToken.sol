// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

//Free to be minted token just to test, this type of token will be bridged
contract SourceToken is ERC20 {
    constructor() ERC20("SourceToken", "SRT") {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}
