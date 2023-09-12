import { ethers, Contract, Wallet } from 'ethers';
import {Bridge__factory, ERC20__factory  } from '../typechain-types';
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
    const PRIVATE_KEY =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    const sourceContractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const sourceTokenAddress = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
    const LOCALHOST_URL_SOURCE = process.env.LOCALHOST_URL_1 || ''; // Replace with your actual environment variable
    const sourceProvider = new ethers.JsonRpcProvider(LOCALHOST_URL_SOURCE);
    const sourceWallet = new Wallet(PRIVATE_KEY, sourceProvider);
    console.log("SOURCE URL:", LOCALHOST_URL_SOURCE);
    const sourceBridgeContract = new Contract(
        sourceContractAddress,
        Bridge__factory.abi,
        sourceWallet
    );

    const targetContractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const LOCALHOST_URL_TARGET = process.env.LOCALHOST_URL_2 || ''; // Replace with your actual environment variable
    const targetProvider = new ethers.JsonRpcProvider(LOCALHOST_URL_TARGET);
    const targetWallet = new Wallet(PRIVATE_KEY, targetProvider);

    console.log("TARGET URL:", LOCALHOST_URL_TARGET);
    const targetBridgeContract = new Contract(
        targetContractAddress,
        Bridge__factory.abi,
        targetWallet
    );

    async function getClaimable(address: string, tokenAddress: string) {
        return await targetBridgeContract.claimableFor(address, tokenAddress);
    }

    
    async function getReleasable(address: string, tokenAddress: string) {
        return await sourceBridgeContract.releasableFor(address, tokenAddress);
    }

        
    async function getBalanceOf(provider: ethers.JsonRpcProvider, address: string, tokenAddress: string) {
        const tokenContract = new Contract(
            tokenAddress,
            ERC20__factory.abi,
            provider
        );
        return await tokenContract.balanceOf(address);
    }

    sourceBridgeContract.on("TokenLocked", async (owner,tokenAddress, amount, event) => {
        const tx = await targetBridgeContract.addClaim(owner,tokenAddress, amount);
        await tx;
        console.log("locked successfully");
        console.log("claimable for:",await getClaimable(owner, tokenAddress));
    });

    targetBridgeContract.on("WrappedTokenCreated", async(sourceTokenAddress, targetTokenAddress, event)=> {
        const tx = await sourceBridgeContract.addTokensMapping(sourceTokenAddress, targetTokenAddress);
        console.log(`A new tokens mapping was added ${sourceTokenAddress} -> ${targetTokenAddress}`);
        console.log(`Tx:::::`, tx);
    });
        
    targetBridgeContract.on("TokenClaimed", async (owner,sourceTokenAddress, tokenAddress, amount, event) => {
        console.log("Token claimed successfully: ", amount);
        console.log(`Balance after claim for address:${owner} and tokenAddress: ${tokenAddress}: `,await getBalanceOf(targetProvider, owner, tokenAddress));
    });

    targetBridgeContract.on("TokenBurned", async (owner, sourceTokenAddress, tokenAddress, amount, event) => {
        const tx = await sourceBridgeContract.addReleased(owner,sourceTokenAddress, amount);
        await tx;
        console.log("Burned successfully");
        console.log(`releasable for ${owner} and token=${tokenAddress}:`,await getReleasable(owner, sourceTokenAddress));
    }); 
    
    sourceBridgeContract.on("TokenReleased", async (owner, tokenAddress, amount, event) => {
        console.log("Token released successfully: ", amount);
        console.log(`Balance after release for address:${owner} and tokenAddress: 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512: `,
        await getBalanceOf(sourceProvider, owner, "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512"));
    });





}

main();