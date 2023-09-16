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
error TokenNotMapped(WrapperToken tokenAddress);
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
    mapping(address => address) public baseToWrappedToken;
    mapping(address => address) public wrappedToBaseToken;

    //owner to target token to amount to be claimed
    mapping(address => mapping(address => uint256)) public claimableFor;

    //owner to target token to amount to be released
    mapping(address => mapping(address => uint256)) public releasableFor;

    //lock to the source bridge
    function lock(IERC20 tokenAddress, uint256 amount) public {
        tokenAddress.transferFrom(msg.sender, address(this), amount);
        emit TokenLocked(msg.sender, address(tokenAddress), amount);
    }

    //claim from the target bridge
    function claim(address tokenAddress, uint256 amount) public {
        uint256 availableToClaim = claimableFor[msg.sender][tokenAddress];
        if (amount > availableToClaim) {
            revert InsufficientClaimableFunds(
                msg.sender,
                tokenAddress,
                amount,
                availableToClaim
            );
        }
        address wrappedToken = baseToWrappedToken[address(tokenAddress)];
        if (wrappedToken == address(0)) {
            wrappedToken = address(new WrapperToken());
            _addTokensMapping(address(tokenAddress), wrappedToken);

            emit WrappedTokenCreated(address(tokenAddress), wrappedToken);
        }

        WrapperToken(wrappedToken).mint(msg.sender, amount);
        claimableFor[msg.sender][tokenAddress] -= amount;
        emit TokenClaimed(
            msg.sender,
            address(tokenAddress),
            wrappedToken,
            amount
        );
    }

    //burn form the target bridge
    function burn(WrapperToken tokenAddress, uint256 amount) public {
        address baseToken = wrappedToBaseToken[address(tokenAddress)];
        if (baseToken == address(0)) {
            revert TokenNotMapped(tokenAddress);
        }
        if (tokenAddress.balanceOf(msg.sender) < amount) {
            revert InsufficientTokenBalance(
                msg.sender,
                address(tokenAddress),
                amount,
                tokenAddress.balanceOf(msg.sender)
            );
        }

        tokenAddress.burn(msg.sender, amount);
        emit TokenBurned(msg.sender, baseToken, address(tokenAddress), amount);
    }

    //release from the target bridge
    function release(address tokenAddress, uint256 amount) public {
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
        emit TokenReleased(msg.sender, address(tokenAddress), amount);
    }

    function addClaim(
        address tokensOwner,
        address tokenAddress,
        uint256 amount
    ) public onlyOwner {
        claimableFor[tokensOwner][tokenAddress] += amount;
    }

    function addReleased(
        address tokensOwner,
        address tokenAddress,
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
}
