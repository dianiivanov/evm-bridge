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
    bytes32 private constant _CLAIM_TYPEHASH =
        keccak256(
            "Claim(address wrapperTokenAddress,uint256 amount,uint256 nonce,uint256 deadline)"
        );
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

    event WrapperTokenCreated(
        address indexed sourceTokenAddress,
        address indexed targetTokenAddress
    );

    event TokensToBeReleasedAdded(
        address indexed tokensOwnerAddress,
        address indexed sourceTokenAddress,
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
    function lock(
        address tokenAddress,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        ERC20Permit sourceToken = ERC20Permit(tokenAddress);
        sourceToken.permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );
        sourceToken.transferFrom(msg.sender, address(this), amount);
        emit TokenLocked(msg.sender, tokenAddress, amount);
    }

    /* @dev Internally deploys a new WrapperToken for the given sourceToken, if does not exist
     * @notice Claims tokens from the target chain based on source tokens locked on the source chain.
     * @param wrapperTokenAddress Address of the wrapper token.
     * @param amount Amount of tokens to claim.
     */
    function claim(
        address wrapperTokenAddress,
        uint256 amount
    ) external onlyForMappedWrapperTopken(wrapperTokenAddress) {
        uint256 availableToClaim = claimableFor[msg.sender][
            wrapperTokenAddress
        ];
        if (amount > availableToClaim) {
            revert InsufficientClaimableFunds(
                msg.sender,
                wrapperTokenAddress,
                amount,
                availableToClaim
            );
        }

        claimableFor[msg.sender][wrapperTokenAddress] -= amount;
        WrapperToken(wrapperTokenAddress).mint(msg.sender, amount);
        emit TokenClaimed(
            msg.sender,
            wrapperToBaseToken[wrapperTokenAddress],
            wrapperTokenAddress,
            amount
        );
    }

    /*
     * @notice Burns wrapped tokens on the target chain.
     * @param wrapperTokenAddress Address of the wrapped token.
     * @param amount Amount of wrapped tokens to burn.
     */
    function burn(
        address wrapperTokenAddress,
        uint256 amount
    ) external onlyForMappedWrapperTopken(wrapperTokenAddress) {
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
        emit TokenBurned(
            msg.sender,
            wrapperToBaseToken[wrapperTokenAddress],
            wrapperTokenAddress,
            amount
        );
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
     * @param wrapperTokenAddress Address of the wrapper token.
     * @param amount Amount of tokens to add that can be claimed from the target bridge.
     */
    function addClaim(
        address tokensOwner,
        address sourceTokenAddress,
        uint256 amount,
        string memory sourceTokenName,
        string memory sourceTokenSymbol
    ) external onlyOwner {
        address wrappedTokenAddress = baseToWrapperToken[sourceTokenAddress];
        if (wrappedTokenAddress == address(0)) {
            wrappedTokenAddress = address(
                new WrapperToken(
                    string.concat("Wrapper_", sourceTokenName),
                    string.concat("WRP_", sourceTokenSymbol)
                )
            );
            _addTokensMapping(sourceTokenAddress, wrappedTokenAddress);

            emit WrapperTokenCreated(sourceTokenAddress, wrappedTokenAddress);
        }

        claimableFor[tokensOwner][wrappedTokenAddress] += amount;
        emit TokensToBeClaimedAdded(
            tokensOwner,
            wrappedTokenAddress,
            amount,
            claimableFor[tokensOwner][wrappedTokenAddress]
        );
    }

    /*
     * @dev Must be executed on the source chain after tokens were burnt with a specific amount on the target chain
     * @notice Adds an amount to the releasable balance of a specific user.
     * @param tokensOwner Address of the user.
     * @param tokenAddress Address of the source token.
     * @param amount Amount of tokens to add.
     */
    function addRelease(
        address tokensOwner,
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        releasableFor[tokensOwner][tokenAddress] += amount;
        emit TokensToBeReleasedAdded(
            tokensOwner,
            tokenAddress,
            amount,
            releasableFor[tokensOwner][tokenAddress]
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

    modifier onlyForMappedWrapperTopken(address wrapperTokenAddress) {
        address baseToken = wrapperToBaseToken[wrapperTokenAddress];
        if (baseToken == address(0)) {
            revert TokenNotMapped(wrapperTokenAddress);
        }
        _;
    }
}
