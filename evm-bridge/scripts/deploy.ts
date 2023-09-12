import {ethers} from "hardhat";

export async function deployToken(tokenContractName: string) {
    const TokenFactory = await ethers.getContractFactory(tokenContractName);
    const tokenContract = await TokenFactory.deploy();
    await tokenContract.waitForDeployment();

    const tx = await tokenContract.deploymentTransaction();
    console.log(`The ${tokenContractName} contract is deployed to ${tokenContract.target}`);
    console.log(`Owner=${tx?.from}, transaction hash: ${tx?.hash}`)
    return tx;
}


export async function deployBridge() {
    const BridgeFactory = await ethers.getContractFactory("Bridge");
    const bridgeContract = await BridgeFactory.deploy();
    await bridgeContract.waitForDeployment();

    const tx = await bridgeContract.deploymentTransaction();
    console.log(`The Bridge contract is deployed to ${bridgeContract.target}`);
    console.log(`Owner=${tx?.from}, transaction hash: ${tx?.hash}`)
    return tx;
}

