import { ethers } from "hardhat"
import { Signer } from "ethers";
import { contracts } from "../typechain-types";
import { expect } from "chai";
import BigNumber from 'bignumber.js';

describe("WrapperToken", function () {
    let wrapperTokenContractOwner: Signer;
    let notOwner: Signer;
    let wrapperTokenContract: contracts.WrapperToken;

    const name = "WrapperToken";
    const symbol = "WRT";
    const amount: BigNumber = BigNumber(1000);

    async function deployWrapperToken(name: string, symbol: string) {
        const wrapperTokenFactory = await ethers.getContractFactory("WrapperToken");
        return await wrapperTokenFactory.connect(wrapperTokenContractOwner).deploy(name, symbol);
    }

    before(async () => {
        [wrapperTokenContractOwner, notOwner] = await ethers.getSigners();
        wrapperTokenContract = await deployWrapperToken(name, symbol);
    });

    async function getBalanceOf(address: string) {
        return BigNumber(((await wrapperTokenContract.balanceOf(address)).toString()))
    }

    describe("Mint and burn", async function () {

        it("Mint should revert", async function () {
            await expect(wrapperTokenContract.connect(notOwner).mint(notOwner.getAddress(), amount.toString()))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should mint given amount", async function () {
            const balanceBefore: BigNumber = await getBalanceOf(await notOwner.getAddress());
            await wrapperTokenContract.connect(wrapperTokenContractOwner).mint(notOwner.getAddress(), amount.toString());
            expect(await getBalanceOf(await notOwner.getAddress())).to.equal(balanceBefore.plus(amount));
        });

        it("Burn should revert", async function () {
            await expect(wrapperTokenContract.connect(notOwner).burn(notOwner.getAddress(), amount.toString()))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should burn given amount", async function () {
            const balanceBefore: BigNumber = await getBalanceOf(await notOwner.getAddress());
            await wrapperTokenContract.connect(wrapperTokenContractOwner).burn(notOwner.getAddress(), amount.toString());
            expect(await getBalanceOf(await notOwner.getAddress())).to.equal(balanceBefore.minus(amount));
        });
    });
})