import {ethers} from "hardhat";

export async function deploySourceToken(tokenName:string, tokenSymbol:string) {
    const TokenFactory = await ethers.getContractFactory("SourceToken");
    const tokenContract = await TokenFactory.deploy(tokenName, tokenSymbol);
    await tokenContract.waitForDeployment();

    const tx = tokenContract.deploymentTransaction();
    console.log(`The SourceToken contract is deployed to ${tokenContract.target}`);
    return tx;
}


export async function deployBridge() {
    const BridgeFactory = await ethers.getContractFactory("Bridge");
    const bridgeContract = await BridgeFactory.deploy();
    await bridgeContract.waitForDeployment();

    const tx = bridgeContract.deploymentTransaction();
    console.log(`The Bridge contract is deployed to ${bridgeContract.target}`);
    console.log(`Owner=${tx?.from}, transaction hash: ${tx?.hash}`)
    return tx;
}

