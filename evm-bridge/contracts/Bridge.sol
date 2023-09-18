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

/*
 * @title Bridge - Decentralized Token Bridge Contract
 * @notice The Bridge contract provides functions for locking, claiming, burning, and releasing tokens.
 * @dev This bridge utilizes both base and wrapper tokens to manage cross-chain transfers.
 */
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

    event TokensToBeReleasedAdded(
        address indexed tokensOwnerAddress,
        address indexed sourceTokenAddress,
        address indexed targetTokenAddress,
        uint256 amountAdded,
        uint256 newAmount
    );

    event TokensToBeClaimedAdded(
        address indexed tokensOwnerAddress,
        address indexed sourceTokenAddress,
        uint256 amountAdded,
        uint256 newAmount
    );

    //bi-directional mapping
    mapping(address => address) public baseToWrapperToken;
    mapping(address => address) public wrapperToBaseToken;

    //owner to target token to amount to be claimed
    mapping(address => mapping(address => uint256)) public claimableFor;

    //owner to target token to amount to be released
    mapping(address => mapping(address => uint256)) public releasableFor;

    /*
     * @notice Locks tokens in the bridge.
     * @param tokenAddress Address of the source token to lock.
     * @param amount Amount of source tokens to lock.
     */
    function lock(address tokenAddress, uint256 amount) public {
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        emit TokenLocked(msg.sender, tokenAddress, amount);
    }

    /* @dev Internally deploys a new WrapperToken for the given sourceToken, if does not exist
     * @notice Claims tokens from the target chain based on source tokens locked on the source chain.
     * @param tokenAddress Address of the source token.
     * @param amount Amount of tokens to claim.
     */
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

    /*
     * @notice Burns wrapped tokens on the target chain.
     * @param wrapperTokenAddress Address of the wrapped token.
     * @param amount Amount of wrapped tokens to burn.
     */
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

    /*
     * @notice Releases source tokens that were burnt on the target chain.
     * @param tokenAddress Address of the source token.
     * @param amount Amount of source tokens to release.
     */
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

    /*
     * @dev Must be executed on the target chain after tokens were locked with a specific amount on the source chain
     * @notice Adds an amount to the claimable balance of a specific user.
     * @param tokensOwner Address of the user.
     * @param tokenAddress Address of the source token.
     * @param amount Amount of tokens to add.
     */
    function addClaim(
        address tokensOwner,
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        claimableFor[tokensOwner][tokenAddress] += amount;
        emit TokensToBeClaimedAdded(
            tokensOwner,
            tokenAddress,
            amount,
            claimableFor[tokensOwner][tokenAddress]
        );
    }

    /*
     * @dev Must be executed on the source chain after tokens were burnt with a specific amount on the target chain
     * @notice Adds an amount to the releasable balance of a specific user.
     * @param tokensOwner Address of the user.
     * @param tokenAddress Address of the source token.
     * @param amount Amount of tokens to add.
     */
    function addReleased(
        address tokensOwner,
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        releasableFor[tokensOwner][tokenAddress] += amount;
        emit TokensToBeReleasedAdded(
            tokensOwner,
            tokenAddress,
            wrapperToBaseToken[tokenAddress],
            amount,
            claimableFor[tokensOwner][tokenAddress]
        );
    }

    /*
     * @dev Private function to add mapping for source and target tokens.
     * @param sourceTokenAddress Address of the source token.
     * @param targetTokenAddress Address of the target token(wrapper token).
     */
    function _addTokensMapping(
        address sourceTokenAddress,
        address targetTokenAddress
    ) private {
        baseToWrapperToken[sourceTokenAddress] = targetTokenAddress;
        wrapperToBaseToken[targetTokenAddress] = sourceTokenAddress;
    }
}
