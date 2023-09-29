import { ethers } from "hardhat"
import { Contract, Signer } from "ethers";
import { ERC20, WrapperToken__factory, contracts } from "../typechain-types";
import { expect } from "chai";
import BigNumber from 'bignumber.js';
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs';

describe("Bridge", function () {
    let bridgeOwnerUser: Signer;
    let user: Signer;
    let bridgeContract: contracts.Bridge;
    let userAddress: string;
    let bridgeAddress: string;
    let bridgeOwnerUserAddress: string;

    const startingAmount: BigNumber = BigNumber(1000);
    const amount: BigNumber = BigNumber(100);

    let sourceTokenContract: contracts.SourceToken;
    let sourceTokenAddress: string;

    let wrapperTokenContract: contracts.WrapperToken;
    let wrapperTokenAddress: string;

    const name = "SourceToken";
    const symbol = "SRCT";

    async function deploySourceToken(name: string, symbol: string) {
        const sourceTokenFactory = await ethers.getContractFactory("SourceToken");
        return await sourceTokenFactory.deploy(name, symbol);
    }

    async function deployBridge() {
        const bridgeFactory = await ethers.getContractFactory("Bridge");
        return await bridgeFactory.deploy();
    }

    before(async () => {
        [bridgeOwnerUser, user] = await ethers.getSigners();
        bridgeContract = await deployBridge();
        sourceTokenContract = await deploySourceToken(name, symbol);
        userAddress = await user.getAddress();
        bridgeOwnerUserAddress = await bridgeOwnerUser.getAddress();
        bridgeAddress = await bridgeContract.getAddress();
        sourceTokenAddress = await sourceTokenContract.getAddress();
        await sourceTokenContract.connect(bridgeOwnerUser).mint(user.getAddress(), startingAmount.toString());
        await sourceTokenContract.connect(user).approve(bridgeContract.getAddress(), startingAmount.toString());
    });

    async function getBalanceOf(tokenContract: ERC20, address: string) {
        return BigNumber(((await tokenContract.balanceOf(address)).toString()))
    }

    describe("Lock", async function () {
        it("Lock should be reverted due to not enough allowance", async function () {
            await expect(bridgeContract.connect(user).lock(sourceTokenAddress, startingAmount.plus(amount).toString()))
                .to.be.revertedWith('ERC20: insufficient allowance');
        });

        it("Lock should be reverted due to not enough allowance", async function () {
            await sourceTokenContract.connect(user).increaseAllowance(bridgeAddress, amount.toString());

            await expect(bridgeContract.connect(user).lock(sourceTokenAddress, startingAmount.plus(amount).toString()))
                .to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });

        it("Lock should be successful and amount transferred to bridge", async function () {
            const userBalanceBeforeLock: BigNumber = await getBalanceOf(sourceTokenContract, userAddress);
            const bridgeBalanceBeforeLock: BigNumber = await getBalanceOf(sourceTokenContract, bridgeAddress);

            await expect(bridgeContract.connect(user).lock(sourceTokenAddress, amount.toString()))
                .to.emit(bridgeContract, "TokenLocked")
                .withArgs(userAddress, sourceTokenAddress, amount)
                .to.emit(sourceTokenContract, "Transfer")
                .withArgs(userAddress, bridgeAddress, amount);

            expect(await getBalanceOf(sourceTokenContract, userAddress)).to.equal(userBalanceBeforeLock.minus(amount));
            expect(await getBalanceOf(sourceTokenContract, bridgeAddress)).to.equal(bridgeBalanceBeforeLock.plus(amount));
        });
    });

    describe("Claim", async function () {
        it("Claim should be reverted with TokenNotMapped", async function () {
            await expect(bridgeContract.connect(user).claim(sourceTokenAddress, amount.toString()))
                .to.be.revertedWithCustomError(bridgeContract, "TokenNotMapped")
                .withArgs(sourceTokenAddress);
        });

        it("Claim should be reverted with InsufficientClaimableFunds", async function () {
            await expect(await bridgeContract.connect(bridgeOwnerUser).addClaim(userAddress, sourceTokenAddress, amount.toString(), name, symbol))
                .to.emit(bridgeContract, 'WrapperTokenCreated')
                .withArgs(sourceTokenAddress, anyValue)
                .to.emit(bridgeContract, 'TokensToBeClaimedAdded')
                .withArgs(userAddress, anyValue, amount, amount);


            wrapperTokenAddress = await bridgeContract.baseToWrapperToken(sourceTokenAddress);
            wrapperTokenContract = WrapperToken__factory.connect(wrapperTokenAddress, user);

            await expect(bridgeContract.connect(user).claim(wrapperTokenAddress, startingAmount.toString()))
                .to.be.revertedWithCustomError(bridgeContract, "InsufficientClaimableFunds")
                .withArgs(userAddress, wrapperTokenAddress, startingAmount, amount);
        });

        it("Claim should be succsessful", async function () {
            const claimsBeforeAdd = await bridgeContract.claimableFor(userAddress, wrapperTokenAddress);
            await expect(await bridgeContract.connect(bridgeOwnerUser).addClaim(userAddress, sourceTokenAddress, amount.toString(), name, symbol))
                .to.emit(bridgeContract, 'TokensToBeClaimedAdded')
                .withArgs(userAddress, wrapperTokenAddress, amount, amount.plus(claimsBeforeAdd.toString()));

            await expect(bridgeContract.connect(user).claim(wrapperTokenAddress, amount.toString()))
                .to.emit(bridgeContract, "TokenClaimed");
        });
    });

    describe("Burn", async function () {
        it("Burn should be reverted with TokenNotMapped", async function () {
            await expect(bridgeContract.connect(user).burn(sourceTokenAddress, amount.toString()))
                .to.be.revertedWithCustomError(bridgeContract, "TokenNotMapped")
                .withArgs(sourceTokenAddress);
        });

        it("Burn should be reverted with InsufficientTokenBalance", async function () {
            await expect(bridgeContract.connect(user).burn(wrapperTokenAddress, startingAmount.toString()))
                .to.be.revertedWithCustomError(bridgeContract, "InsufficientTokenBalance")
                .withArgs(userAddress, wrapperTokenAddress, startingAmount, await wrapperTokenContract.balanceOf(userAddress));
        });

        it("Burn should be succsessful", async function () {
            const userBalanceBeforeBurn: BigNumber = await getBalanceOf(wrapperTokenContract, userAddress);

            await expect(bridgeContract.connect(user).burn(wrapperTokenAddress, amount.toString()))
                .to.emit(bridgeContract, "TokenBurned")
                .withArgs(userAddress, sourceTokenAddress, wrapperTokenAddress, amount);

            expect(await getBalanceOf(wrapperTokenContract, userAddress)).to.equal(userBalanceBeforeBurn.minus(amount));
        });
    });


    describe("Release", async function () {
        it("Claim should be reverted with InsufficientReleasableFunds", async function () {
            await expect(await bridgeContract.connect(bridgeOwnerUser).addRelease(userAddress, sourceTokenAddress, amount.toString()))
                .to.emit(bridgeContract, 'TokensToBeReleasedAdded')
                .withArgs(userAddress, sourceTokenAddress, amount, amount);

            await expect(bridgeContract.connect(user).release(sourceTokenAddress, startingAmount.toString()))
                .to.be.revertedWithCustomError(bridgeContract, "InsufficientReleasableFunds")
                .withArgs(userAddress, sourceTokenAddress, startingAmount, amount);
        });

        it("Release should be successful", async function () {
            const userBalanceBeforeRelease: BigNumber = await getBalanceOf(sourceTokenContract, userAddress);

            await expect(bridgeContract.connect(user).release(sourceTokenAddress, amount.toString()))
                .to.emit(bridgeContract, "TokenReleased")
                .withArgs(userAddress, sourceTokenAddress, amount);

            expect(await getBalanceOf(sourceTokenContract, userAddress)).to.equal(userBalanceBeforeRelease.plus(amount));
        });
    });

    describe("addClaim", async () => {
        it("addClaim should revert if called by not owner", async function () {
            await expect(bridgeContract.connect(user).addClaim(userAddress, sourceTokenAddress, amount.toString(), name, symbol))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    })

    describe("addRelease", async () => {
        it("addRelease should revert if called by not owner", async function () {
            await expect(bridgeContract.connect(user).addRelease(userAddress, sourceTokenAddress, amount.toString()))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });
    })
})