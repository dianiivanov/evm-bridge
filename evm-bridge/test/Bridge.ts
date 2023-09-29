import { ethers } from "hardhat"
import { Signer } from "ethers";
import { contracts } from "../typechain-types";
import { expect } from "chai";
import BigNumber from 'bignumber.js';

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

    async function getBalanceOf(address: string) {
        return BigNumber(((await sourceTokenContract.balanceOf(address)).toString()))
    }

    describe("Lock", async function () {
        // it("Lock should revert", async function () {
        //     await expect(bridgeContract.connect(user).lock(user.getAddress(), amount.toString()))
        //         .to.be.revertedWith("Ownable: caller is not the owner");
        // });
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
            const userBalanceBeforeLock: BigNumber = await getBalanceOf(userAddress);
            const bridgeBalanceBeforeLock: BigNumber = await getBalanceOf(bridgeAddress);

            await expect(bridgeContract.connect(user).lock(sourceTokenAddress, amount.toString()))
                .to.emit(bridgeContract, "TokenLocked")
                .withArgs(userAddress, sourceTokenAddress, amount);

            expect(await getBalanceOf(userAddress)).to.equal(userBalanceBeforeLock.minus(amount));
            expect(await getBalanceOf(bridgeAddress)).to.equal(bridgeBalanceBeforeLock.plus(amount));
        });
    });

    describe("Claim", async function () {
        it("Claim should be reverted due to not enough allowance", async function () {
            await expect(bridgeContract.connect(user).claim(sourceTokenAddress, amount.toString()))
                .to.be.revertedWithCustomError(bridgeContract, "TokenNotMapped");
        });

        it("Lock should be reverted due to not enough allowance", async function () {
            await sourceTokenContract.connect(user).increaseAllowance(bridgeAddress, amount.toString());

            await expect(bridgeContract.connect(user).lock(sourceTokenAddress, startingAmount.plus(amount).toString()))
                .to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });

        it("Lock should be successful and amount transferred to bridge", async function () {
            const userBalanceBeforeLock: BigNumber = await getBalanceOf(userAddress);
            const bridgeBalanceBeforeLock: BigNumber = await getBalanceOf(bridgeAddress);

            await expect(bridgeContract.connect(user).lock(sourceTokenAddress, amount.toString()))
                .to.emit(bridgeContract, "TokenLocked")
                .withArgs(userAddress, sourceTokenAddress, amount);

            expect(await getBalanceOf(userAddress)).to.equal(userBalanceBeforeLock.minus(amount));
            expect(await getBalanceOf(bridgeAddress)).to.equal(bridgeBalanceBeforeLock.plus(amount));
        });
    });
})