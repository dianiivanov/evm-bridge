import { ethers, Contract, Wallet } from 'ethers';
import {Bridge__factory, ERC20__factory  } from '../typechain-types';
import * as dotenv from "dotenv";
dotenv.config();
import { EventService } from '../events/events.service';
import { Inject, Injectable } from '@nestjs/common/decorators';
import { TokenLocked } from '../events/entities/tokenlocked.entity';
import { TokenClaimed } from '../events/entities/tokenclaimed.entity';
import { TokenBurned } from '../events/entities/tokenburned.entity';
import { TokenReleased } from '../events/entities/tokenreleased.entity';

@Injectable()
export class BridgeListener {

    constructor(
    @Inject(EventService)
        private readonly eventService: EventService,
    ) {}

  async main() {
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const INFURA_SEPOLIA_URL = `${process.env.INFURA_SEPOLIA_URL}${process.env.INFURA_API_KEY}`
    const INFURA_GOERLI_URL = `${process.env.INFURA_GOERLI_URL}${process.env.INFURA_API_KEY}`;
    const BLOCKCHAIN_URL_1 = process.env.BLOCKCHAIN_URL_1;
    const BRIDGE_ADDRESS_1 = process.env.BRIDGE_ADDRESS_1;

    const BLOCKCHAIN_URL_2 = process.env.BLOCKCHAIN_URL_2;
    const BRIDGE_ADDRESS_2 = process.env.BRIDGE_ADDRESS_2;
    
    const BLOCKHAIN_NAME_1 = process.env.BLOCKHAIN_NAME_1;
    const BLOCKHAIN_NAME_2 = process.env.BLOCKHAIN_NAME_2;

    const sourceProvider = new ethers.JsonRpcProvider(BLOCKCHAIN_URL_1);
    const sourceWallet = new Wallet(PRIVATE_KEY, sourceProvider);

    const sourceBridgeContract = new Contract(
        BRIDGE_ADDRESS_1,
        Bridge__factory.abi,
        sourceWallet
    );

    const targetProvider = new ethers.JsonRpcProvider(BLOCKCHAIN_URL_2);
    const targetWallet = new Wallet(PRIVATE_KEY, targetProvider);
    
    const targetBridgeContract = new Contract(
        BRIDGE_ADDRESS_2,
        Bridge__factory.abi,
        targetWallet
    );
        
    async function getBalanceOf(provider: ethers.JsonRpcProvider, address: string, tokenAddress: string) {
        const tokenContract = new Contract(
            tokenAddress,
            ERC20__factory.abi,
            provider
        );
        return await tokenContract.balanceOf(address);
    }

    sourceBridgeContract.on("TokenLocked", async (amountOwner,lockedTokenAddress, amount, event) => {
        const tx = await targetBridgeContract.addClaim(amountOwner,lockedTokenAddress, amount);
        await tx;
        console.log(`Successfully locked ${amount}`);
        this.eventService.createTokenLocked(new TokenLocked(amountOwner, lockedTokenAddress, amount, BLOCKHAIN_NAME_1));
    });

    targetBridgeContract.on("TokenLocked", async (amountOwner,lockedTokenAddress, amount, event) => {
        const tx = await sourceBridgeContract.addClaim(amountOwner,lockedTokenAddress, amount);
        await tx;
        console.log(`Successfully locked ${amount}`);
        this.eventService.createTokenLocked(new TokenLocked(amountOwner, lockedTokenAddress, amount, BLOCKHAIN_NAME_2));
    });

    sourceBridgeContract.on("TokenClaimed", async (amountOwner ,sourceTokenAddress, claimedTokenAddress, amount, event) => {
        console.log(`Successfylly claimed ${amount}`);
        const balanceAfterClaim = await getBalanceOf(sourceProvider, amountOwner, claimedTokenAddress);
        console.log(`Balance after claim for address:${amountOwner} and tokenAddress: ${balanceAfterClaim}.`);
        this.eventService.createTokenClaimed(new TokenClaimed(amountOwner ,sourceTokenAddress,  claimedTokenAddress, amount, BLOCKHAIN_NAME_1));
    });

    targetBridgeContract.on("TokenClaimed", async (amountOwner ,sourceTokenAddress, claimedTokenAddress, amount, event) => {
        console.log(`Successfylly claimed ${amount}`);
        const balanceAfterClaim = await getBalanceOf(targetProvider, amountOwner, claimedTokenAddress);
        console.log(`Balance after claim for address:${amountOwner} and tokenAddress: ${balanceAfterClaim}.`);
        this.eventService.createTokenClaimed(new TokenClaimed(amountOwner ,sourceTokenAddress,  claimedTokenAddress, amount, BLOCKHAIN_NAME_2));
    });

    sourceBridgeContract.on("TokenBurned", async (amountOwner, sourceTokenAddress, burnedTokenAddress, amount, event) => {
        const tx = await targetBridgeContract.addReleased(amountOwner,sourceTokenAddress, amount);
        await tx;
        console.log("Burned successfully");
        const balanceAfterBurn = await getBalanceOf(sourceProvider, amountOwner, burnedTokenAddress);
        console.log(`Balance after BURN for address:${amountOwner} and tokenAddress${sourceTokenAddress} : ${balanceAfterBurn}.`);
        this.eventService.createTokenBurned(new TokenBurned(amountOwner,sourceTokenAddress,  burnedTokenAddress, amount, BLOCKHAIN_NAME_1));
    }); 

    targetBridgeContract.on("TokenBurned", async (amountOwner, sourceTokenAddress, burnedTokenAddress, amount, event) => {
        const tx = await sourceBridgeContract.addReleased(amountOwner,sourceTokenAddress, amount);
        await tx;
        console.log("Burned successfully");
        const balanceAfterRelease = await getBalanceOf(targetProvider, amountOwner, burnedTokenAddress);
        console.log(`Balance after BURN for address:${amountOwner} and tokenAddress${sourceTokenAddress} : ${balanceAfterRelease}.`);
        this.eventService.createTokenBurned(new TokenBurned(amountOwner,sourceTokenAddress,  burnedTokenAddress, amount, BLOCKHAIN_NAME_2));
    }); 

    sourceBridgeContract.on("TokenReleased", async (amountOwner, releasedTokenAddress, amount, event) => {
        console.log("Token released successfully: ", amount);
        const balanceAfterRelease = await getBalanceOf(sourceProvider, amountOwner, releasedTokenAddress);
        console.log(`Balance after BURN for address:${amountOwner} and tokenAddress${releasedTokenAddress} : ${balanceAfterRelease}.`);
        this.eventService.createTokenReleased(new TokenReleased(amountOwner,  releasedTokenAddress, amount, BLOCKHAIN_NAME_1));
    });

    targetBridgeContract.on("TokenReleased", async (amountOwner, releasedTokenAddress, amount, event) => {
        console.log("Token released successfully: ", amount);
        const balanceAfterRelease = await getBalanceOf(targetProvider, amountOwner, releasedTokenAddress);
        console.log(`Balance after BURN for address:${amountOwner} and tokenAddress${releasedTokenAddress} : ${balanceAfterRelease}.`);
        this.eventService.createTokenReleased(new TokenReleased(amountOwner,  releasedTokenAddress, amount, BLOCKHAIN_NAME_2));
    });
}

}