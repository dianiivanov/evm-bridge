import { ethers } from "hardhat"
import { Signer } from "ethers";
import { contracts } from "../typechain-types";
import { expect } from "chai";
import BigNumber from 'bignumber.js';

describe("SourceToken", function () {
    let fstUser: Signer;
    let sndUser: Signer;
    let sourceTokenContract: contracts.SourceToken;

    const name = "SourceToken";
    const symbol = "SRCT";
    const amount: BigNumber = BigNumber(1000);

    async function deploySourceToken(name: string, symbol: string) {
        const sourceTokenFactory = await ethers.getContractFactory("SourceToken");
        return await sourceTokenFactory.deploy(name, symbol);
    }

    before(async () => {
        [fstUser, sndUser] = await ethers.getSigners();
        sourceTokenContract = await deploySourceToken(name, symbol);
    });

    async function getBalanceOf(address: string) {
        return BigNumber(((await sourceTokenContract.balanceOf(address)).toString()))
    }

    describe("Mint", async function () {

        it("First user should be able to mint the given amount", async function () {
            const balanceBefore: BigNumber = await getBalanceOf(await fstUser.getAddress());
            await sourceTokenContract.connect(fstUser).mint(fstUser.getAddress(), amount.toString());
            expect(await getBalanceOf(await fstUser.getAddress())).to.equal(balanceBefore.plus(amount));
        });

        it("Second user should be able to mint the given amount", async function () {
            const balanceBefore: BigNumber = await getBalanceOf(await fstUser.getAddress());
            await sourceTokenContract.connect(sndUser).mint(fstUser.getAddress(), amount.toString());
            expect(await getBalanceOf(await fstUser.getAddress())).to.equal(balanceBefore.plus(amount));
        });
    });
})