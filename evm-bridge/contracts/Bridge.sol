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

error InvalidNonce(
    address account,
    address tokenAddress,
    uint256 requested,
    uint256 available
);

error InvalidSignature(
    address account,
    address sourceTokenAddress,
    uint256 amount,
    uint256 nonce,
    bytes signature
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

    //owner to target token to amount to be released
    mapping(address => mapping(uint256 => bool)) public usedNonces;

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
        address sourceTokenAddress,
        uint256 amount,
        uint256 nonce,
        string memory sourceTokenName,
        string memory sourceTokenSymbol,
        bytes memory signature
    )
        external
        _onlyForValidSignature(
            msg.sender,
            sourceTokenAddress,
            amount,
            nonce,
            signature
        )
    {
        address wrapperTokenAddress = baseToWrapperToken[sourceTokenAddress];
        if (wrapperTokenAddress == address(0)) {
            wrapperTokenAddress = address(
                new WrapperToken(
                    string.concat("Wrapper_", sourceTokenName),
                    string.concat("WRP_", sourceTokenSymbol)
                )
            );
            _addTokensMapping(sourceTokenAddress, wrapperTokenAddress);

            emit WrapperTokenCreated(sourceTokenAddress, wrapperTokenAddress);
        }

        WrapperToken(wrapperTokenAddress).mint(msg.sender, amount);
        emit TokenClaimed(
            msg.sender,
            wrapperToBaseToken[wrapperTokenAddress],
            wrapperTokenAddress,
            amount
        );
    }

    function prefixed(bytes32 hash) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
            );
    }

    function recoverSigner(
        bytes32 message,
        bytes memory sig
    ) internal pure returns (address) {
        uint8 v;
        bytes32 r;
        bytes32 s;

        (v, r, s) = splitSignature(sig);

        return ecrecover(message, v, r, s);
    }

    function splitSignature(
        bytes memory sig
    ) internal pure returns (uint8, bytes32, bytes32) {
        require(sig.length == 65);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return (v, r, s);
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
    function release(
        address tokenAddress,
        uint256 amount,
        uint256 nonce,
        bytes memory signature
    )
        external
        _onlyForValidSignature(
            msg.sender,
            tokenAddress,
            amount,
            nonce,
            signature
        )
    {
        IERC20(tokenAddress).transfer(msg.sender, amount);
        emit TokenReleased(msg.sender, tokenAddress, amount);
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

    modifier _onlyForValidSignature(
        address sender,
        address tokenAddress,
        uint256 amount,
        uint256 nonce,
        bytes memory signature
    ) {
        if (usedNonces[msg.sender][nonce]) {
            revert InvalidNonce(msg.sender, tokenAddress, amount, nonce);
        }
        usedNonces[msg.sender][nonce] = true;
        //signature check
        bytes32 message = prefixed(
            keccak256(abi.encodePacked(msg.sender, tokenAddress, amount, nonce))
        );

        if (recoverSigner(message, signature) != this.owner()) {
            revert InvalidSignature(
                msg.sender,
                tokenAddress,
                amount,
                nonce,
                signature
            );
        }
        _;
    }
}
