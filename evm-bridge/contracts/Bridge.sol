// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./WrapperToken.sol";
import "./SourceToken.sol";

contract Bridge is Ownable {
    event TokenLocked(
        address indexed amountOwner,
        address indexed lockedTokenAddress,
        uint256 amount
    );
    event TokenClaimed(
        address indexed amountOwner,
        address indexed sourceTokenAddress,
        address indexed claimedTokenAddress,
        uint256 amount
    );
    event TokenBurned(
        address indexed amountOwner,
        address indexed sourceTokenAddress,
        address indexed burnedTokenAddress,
        uint256 amount
    );
    event TokenReleased(
        address indexed amountOwner,
        address indexed releasedTokenAddress,
        uint256 amount
    );

    event WrappedTokenCreated(
        address indexed sourceTokenAddress,
        address indexed targetTokenAddress
    );

    //bi-directional mapping
    mapping(address => address) public baseToWrappedToken;
    mapping(address => address) public wrappedToBaseToken;

    //owner to target token to amount to be claimed
    mapping(address => mapping(IERC20 => uint256)) public claimableFor;

    //owner to target token to amount to be released
    mapping(address => mapping(IERC20 => uint256)) public releasableFor;

    //lock to the source bridge
    function lock(IERC20 tokenAddress, uint256 amount) public {
        tokenAddress.transferFrom(msg.sender, address(this), amount);
        emit TokenLocked(msg.sender, address(tokenAddress), amount);
    }

    //claim from the target bridge
    function claim(IERC20 tokenAddress, uint256 amount) public {
        uint256 tokensToClaim = claimableFor[msg.sender][tokenAddress];
        require(amount <= tokensToClaim);

        if (baseToWrappedToken[address(tokenAddress)] == address(0)) {
            address newWrapperTokenAddress = address(new WrapperToken());
            _addTokensMapping(address(tokenAddress), newWrapperTokenAddress);

            emit WrappedTokenCreated(
                address(tokenAddress),
                newWrapperTokenAddress
            );
        }

        WrapperToken(baseToWrappedToken[address(tokenAddress)]).mint(
            msg.sender,
            amount
        );
        claimableFor[msg.sender][tokenAddress] -= amount;
        emit TokenClaimed(
            msg.sender,
            address(tokenAddress),
            address(baseToWrappedToken[address(tokenAddress)]),
            amount
        );
    }

    //burn form the target bridge
    function burn(WrapperToken tokenAddress, uint256 amount) public {
        require(wrappedToBaseToken[address(tokenAddress)] != address(0));
        require(tokenAddress.balanceOf(msg.sender) >= amount);

        tokenAddress.burn(msg.sender, amount);
        emit TokenBurned(
            msg.sender,
            address(wrappedToBaseToken[address(tokenAddress)]),
            address(tokenAddress),
            amount
        );
    }

    //release from the target bridge
    function release(IERC20 tokenAddress, uint256 amount) public {
        uint256 releasableTokens = releasableFor[msg.sender][tokenAddress];
        require(amount <= releasableTokens);
        tokenAddress.transfer(msg.sender, amount);
        releasableFor[msg.sender][tokenAddress] -= amount;
        emit TokenReleased(msg.sender, address(tokenAddress), amount);
    }

    function addClaim(
        address tokensOwner,
        IERC20 tokenAddress,
        uint256 amount
    ) public onlyOwner {
        claimableFor[tokensOwner][tokenAddress] += amount;
    }

    function addReleased(
        address tokensOwner,
        IERC20 tokenAddress,
        uint256 amount
    ) public onlyOwner {
        releasableFor[tokensOwner][tokenAddress] += amount;
    }

    function _addTokensMapping(
        address sourceTokenAddress,
        address targetTokenAddress
    ) private {
        baseToWrappedToken[sourceTokenAddress] = targetTokenAddress;
        wrappedToBaseToken[targetTokenAddress] = sourceTokenAddress;
    }

    function addTokensMapping(
        address sourceTokenAddress,
        address targetTokenAddress
    ) private onlyOwner {
        _addTokensMapping(sourceTokenAddress, targetTokenAddress);
    }
}
