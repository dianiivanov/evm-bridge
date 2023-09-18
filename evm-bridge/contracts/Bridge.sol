// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./WrapperToken.sol";
import "./SourceToken.sol";

error InsufficientClaimableFunds(
    address account,
    address tokenAddress,
    uint256 requested,
    uint256 available
);
error TokenNotMapped(address wrapperTokenAddress);
error InsufficientTokenBalance(
    address account,
    address tokenAddress,
    uint256 requested,
    uint256 available
);
error InsufficientReleasableFunds(
    address account,
    address tokenAddress,
    uint256 requested,
    uint256 available
);

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
    mapping(address => address) public baseToWrapperToken;
    mapping(address => address) public wrapperToBaseToken;

    //owner to target token to amount to be claimed
    mapping(address => mapping(address => uint256)) public claimableFor;

    //owner to target token to amount to be released
    mapping(address => mapping(address => uint256)) public releasableFor;

    //lock to the source bridge - passing the source's tokenAddress
    function lock(address tokenAddress, uint256 amount) public {
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        emit TokenLocked(msg.sender, tokenAddress, amount);
    }

    //claim from the target bridge based on the source's tokenAddress
    function claim(address tokenAddress, uint256 amount) external {
        uint256 availableToClaim = claimableFor[msg.sender][tokenAddress];
        if (amount > availableToClaim) {
            revert InsufficientClaimableFunds(
                msg.sender,
                tokenAddress,
                amount,
                availableToClaim
            );
        }
        address wrappedToken = baseToWrapperToken[tokenAddress];
        if (wrappedToken == address(0)) {
            wrappedToken = address(new WrapperToken());
            _addTokensMapping(tokenAddress, wrappedToken);

            emit WrappedTokenCreated(tokenAddress, wrappedToken);
        }
        claimableFor[msg.sender][tokenAddress] -= amount;
        WrapperToken(wrappedToken).mint(msg.sender, amount);
        emit TokenClaimed(msg.sender, tokenAddress, wrappedToken, amount);
    }

    //burn form the target bridge - based on the target's wrapped token
    function burn(address wrapperTokenAddress, uint256 amount) external {
        address baseToken = wrapperToBaseToken[wrapperTokenAddress];
        if (baseToken == address(0)) {
            revert TokenNotMapped(wrapperTokenAddress);
        }
        WrapperToken wrapperToken = WrapperToken(wrapperTokenAddress);
        if (wrapperToken.balanceOf(msg.sender) < amount) {
            revert InsufficientTokenBalance(
                msg.sender,
                wrapperTokenAddress,
                amount,
                wrapperToken.balanceOf(msg.sender)
            );
        }

        wrapperToken.burn(msg.sender, amount);
        emit TokenBurned(msg.sender, baseToken, wrapperTokenAddress, amount);
    }

    //release from the source bridge - based on the source's tokenAddress
    function release(address tokenAddress, uint256 amount) external {
        if (amount > releasableFor[msg.sender][tokenAddress]) {
            revert InsufficientReleasableFunds(
                msg.sender,
                tokenAddress,
                amount,
                releasableFor[msg.sender][tokenAddress]
            );
        }
        releasableFor[msg.sender][tokenAddress] -= amount;
        IERC20(tokenAddress).transfer(msg.sender, amount);
        emit TokenReleased(msg.sender, tokenAddress, amount);
    }

    function addClaim(
        address tokensOwner,
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        claimableFor[tokensOwner][tokenAddress] += amount;
    }

    function addReleased(
        address tokensOwner,
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        releasableFor[tokensOwner][tokenAddress] += amount;
    }

    function _addTokensMapping(
        address sourceTokenAddress,
        address targetTokenAddress
    ) private {
        baseToWrapperToken[sourceTokenAddress] = targetTokenAddress;
        wrapperToBaseToken[targetTokenAddress] = sourceTokenAddress;
    }
}
