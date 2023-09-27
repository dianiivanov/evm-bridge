import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InterfaceAbi, ethers, Wallet } from 'ethers';
import { Bridge__factory, ERC20__factory, SourceToken__factory } from '../typechain-types';
import BigNumber from 'bignumber.js';

@Injectable()
export class BlockchainService implements OnModuleInit {
  private blockchains: any;

  constructor(private configService: ConfigService) { }

  onModuleInit() {
    const BLOCKCHAIN_URL_1 = this.configService.get<string>('BLOCKCHAIN_URL_1');
    const BRIDGE_ADDRESS_1 = this.configService.get<string>('BRIDGE_ADDRESS_1');
    const PROVIDER_1 = new ethers.JsonRpcProvider(BLOCKCHAIN_URL_1);

    const BLOCKCHAIN_URL_2 = this.configService.get<string>('BLOCKCHAIN_URL_2');
    const BRIDGE_ADDRESS_2 = this.configService.get<string>('BRIDGE_ADDRESS_2');
    const PROVIDER_2 = new ethers.JsonRpcProvider(BLOCKCHAIN_URL_2);

    this.blockchains = {
      [process.env.BLOCKHAIN_NAME_1]: {
        url: process.env.BLOCKCHAIN_URL_1,
        bridgeAddress: BRIDGE_ADDRESS_1,
        bridgeContract: new ethers.Contract(
          BRIDGE_ADDRESS_1,
          Bridge__factory.abi,
        ),
        provider: PROVIDER_1,
        defaultWallet: new Wallet(process.env.PRIVATE_KEY, PROVIDER_1)
      },
      [process.env.BLOCKHAIN_NAME_2]: {
        url: process.env.BLOCKCHAIN_URL_2,
        bridgeAddress: BRIDGE_ADDRESS_2,
        bridgeContract: new ethers.Contract(
          BRIDGE_ADDRESS_2,
          Bridge__factory.abi,
        ),
        provider: PROVIDER_2,
        defaultWallet: new Wallet(process.env.PRIVATE_KEY, PROVIDER_2)
      },
    };
  }

  public getBridgeAddress(blockchainName: string) {
    return this.blockchains[blockchainName].bridgeAddress;
  }

  public getAndConnectBridgeContract(blockchainName: string, privateKey: string) {
    const provider = this.blockchains[blockchainName].provider;
    const pk: string = privateKey || this.configService.get('PRIVATE_KEY');
    const wallet = new ethers.Wallet(pk, provider);
    return {
      bridgeContract: this.blockchains[blockchainName].bridgeContract.connect(wallet),
      walletAddress: wallet.address
    }
  }

  public getAndConnectTokenContract(blockchainName: string, tokenAddress: string, privateKey: string, interfaceABI: InterfaceAbi) {
    const provider = this.blockchains[blockchainName].provider;
    const pk: string = privateKey || this.configService.get('PRIVATE_KEY');
    const wallet = new ethers.Wallet(pk, provider);
    return {
      tokenContract: new ethers.Contract(
        tokenAddress,
        interfaceABI,
        wallet
      ),
      walletAddress: wallet.address
    }
  }

  private async approve(blockchainName: string, tokenAddress: string, approvedAddress: string, amount: string, privateKey: string) {
    const { tokenContract, } = this.getAndConnectTokenContract(blockchainName, tokenAddress, privateKey, SourceToken__factory.abi);
    const approveTx = await tokenContract.approve(approvedAddress, amount);
    await approveTx.wait();
  }

  public async lock(blockchainName: string, tokenAddress: string, amount: string, privateKey: string) {
    const { bridgeContract } = this.getAndConnectBridgeContract(blockchainName, privateKey);
    const { tokenName, tokenSymbol } = await this.getTokenNameAndSymbol(blockchainName, tokenAddress, privateKey);

    console.log(`Approving ${blockchainName}'s bridge with address ${bridgeContract.target} to use token ${tokenName} ${amount}${tokenSymbol}...`);
    await this.approve(blockchainName, tokenAddress, this.getBridgeAddress(blockchainName), amount, privateKey);
    console.log(`Approved ${amount}${tokenSymbol}!`);
    console.log(`Locking ${amount}${tokenSymbol} to ${blockchainName}'s bridge...`);
    const transaction = await bridgeContract.lock(tokenAddress, amount);
    await transaction.wait();
    console.log(`Successfully locked ${amount}${tokenSymbol} to the ${blockchainName}'s bridge!`);
  }

  public async claim(blockchainName: string, tokenAddress: string, amount: string, privateKey: string) {
    const { bridgeContract, } = this.getAndConnectBridgeContract(blockchainName, privateKey);
    const { tokenSymbol } = await this.getTokenNameAndSymbol(blockchainName, tokenAddress, privateKey);
    console.log(`Claiming ${amount}${tokenSymbol} from ${blockchainName}'s bridge, bridge's address = ${this.getBridgeAddress(blockchainName)}...`);
    const transaction = await bridgeContract.claim(tokenAddress, amount);
    await transaction.wait();
    console.log(`Successfully claimed ${amount}${tokenSymbol} tokens from the ${blockchainName}'s bridge!`);
  }

  public async burn(blockchainName: string, tokenAddress: string, amount: string, privateKey: string) {
    const { bridgeContract, } = this.getAndConnectBridgeContract(blockchainName, privateKey);
    const { tokenSymbol } = await this.getTokenNameAndSymbol(blockchainName, tokenAddress, privateKey);
    console.log(`Burning ${amount}${tokenSymbol} from ${blockchainName}'s bridge, bridge's address: ${this.getBridgeAddress(blockchainName)}...`);
    const transaction = await bridgeContract.burn(tokenAddress, amount);
    await transaction.wait();
    console.log(`Successfully burned ${amount}${tokenSymbol} from the ${blockchainName}'s bridge!`);
  }

  public async release(blockchainName: string, tokenAddress: string, amount: string, privateKey: string) {
    const { bridgeContract, } = this.getAndConnectBridgeContract(blockchainName, privateKey);
    const { tokenSymbol } = await this.getTokenNameAndSymbol(blockchainName, tokenAddress, privateKey);
    console.log(`Releasing ${amount}${tokenSymbol} from ${blockchainName}'s bridge, bridge's address: ${this.getBridgeAddress(blockchainName)}...`);
    const transaction = await bridgeContract.release(tokenAddress, amount);
    await transaction.wait();
    console.log(`Successfully released ${amount}${tokenSymbol} from the ${blockchainName}'s bridge!`);
  }

  public async mint(blockchainName: string, tokenAddress: string, amount: string, privateKey: string) {
    const { tokenContract, walletAddress } = this.getAndConnectTokenContract(blockchainName, tokenAddress, privateKey, SourceToken__factory.abi);
    const tokenName = await tokenContract.name();
    const tokenSymbol = await tokenContract.symbol();
    const balanceBeforeMint = await tokenContract.balanceOf(walletAddress);
    console.log(`BEFORE-MINT: ${tokenName} balance: ${balanceBeforeMint}`);

    console.log(`Minting ${amount}${tokenSymbol} in ${blockchainName}...`);
    const tx = await tokenContract.mint(walletAddress, amount);
    await tx.wait();
    console.log(`Successfully minted ${amount}${tokenSymbol} in ${blockchainName}!`);

    const balanceAfterMint = await tokenContract.balanceOf(walletAddress);
    console.log(`AFTER-MINT: ${tokenName} balance: ${balanceAfterMint}`);
  }


  public async logBalanceOf(blockchainName: string, tokenAddress: string, publicKey: string, privateKey: string) {
    const { tokenContract, walletAddress } = this.getAndConnectTokenContract(blockchainName, tokenAddress, privateKey, ERC20__factory.abi);
    const tokenName = await tokenContract.name();
    const tokenSymbol = await tokenContract.symbol();

    const balance = await tokenContract.balanceOf(publicKey ? publicKey : walletAddress);

    console.log(`${tokenName} balance of address: ${walletAddress} = ${balance}${tokenSymbol}`);
  }

  public async logReleasableFor(blockchainName: string, tokenAddress: string, publicKey: string, privateKey: string) {
    const { bridgeContract, walletAddress } = this.getAndConnectBridgeContract(blockchainName, privateKey);
    const { tokenContract } = this.getAndConnectTokenContract(blockchainName, tokenAddress, privateKey, ERC20__factory.abi);
    const tokenName = await tokenContract.name();
    const tokenSymbol = await tokenContract.symbol();

    const amountAbleToRelease = await bridgeContract.releasableFor(publicKey ? publicKey : walletAddress, tokenAddress);

    console.log(`${tokenName} releasable balance for user with address ${walletAddress} is ${amountAbleToRelease}${tokenSymbol}`)
  }

  public async logClaimableFor(blockchainName: string, tokenAddress: string, publicKey: string, privateKey: string) {
    const { bridgeContract, walletAddress } = this.getAndConnectBridgeContract(blockchainName, privateKey);
    const { tokenContract, } = this.getAndConnectTokenContract(this.getOppositeBlockchain(blockchainName), tokenAddress, privateKey, ERC20__factory.abi);
    const tokenName = await tokenContract.name();
    const tokenSymbol = await tokenContract.symbol();

    const amountAbleToRelease = await bridgeContract.claimableFor(publicKey ? publicKey : walletAddress, tokenAddress);

    console.log(`${tokenName} claimable balance for user with address ${walletAddress} is ${amountAbleToRelease}${tokenSymbol}`)
  }

  public async handleTokenLockedEvent(blockchainName: string, amountOwner: string, lockedTokenAddress: string, amount: BigNumber) {
    console.log(`Handling ${blockchainName}'s TokenLocked event...`);
    const { tokenName, tokenSymbol } = await this.getTokenNameAndSymbol(blockchainName, lockedTokenAddress, null);
    console.log(`User with address: ${amountOwner} has successfully locked ${amount}${tokenSymbol} to ${blockchainName}'s bridge!`);

    const oppositeBlockchainName = this.getOppositeBlockchain(blockchainName);
    const oppositeBridgeContract = this.blockchains[oppositeBlockchainName].bridgeContract.connect(this.blockchains[oppositeBlockchainName].defaultWallet);
    console.log(`Adding tokens to be claimed in ${oppositeBlockchainName}'s bridge for user with address: ${amountOwner}...`);
    const tx = await oppositeBridgeContract.addClaim(amountOwner, lockedTokenAddress, amount, tokenName, tokenSymbol);
    await tx;
    console.log(`Successfully added amount to be claimed for wrapper of ${tokenName}: ${amount}${tokenSymbol}`);

    console.log(`Obtaining ${tokenName}'s wrapper token...`)
    const wrapperTokenAddress = await oppositeBridgeContract.baseToWrapperToken(lockedTokenAddress);
    const { tokenName: wrapperTokenName, tokenSymbol: wrapperTokenSymbol } = await this.getTokenNameAndSymbol(oppositeBlockchainName, wrapperTokenAddress, null);

    console.log(`Wrapper token address: ${wrapperTokenAddress}`);
    console.log(`Wrapper token name: ${wrapperTokenName}`);
    console.log(`Wrapper token amount added: ${amount}${wrapperTokenSymbol}`);
    console.log(`All wrapper token amount to be claimed: ${await oppositeBridgeContract.claimableFor(amountOwner, wrapperTokenAddress)}${wrapperTokenSymbol}`);
  }

  public async handleTokenClaimedEvent(blockchainName: string, amountOwner: string, claimedTokenAddress: string, amount: BigNumber) {
    console.log(`Handling ${blockchainName}'s TokenClaimed event...`);
    const { tokenSymbol } = await this.getTokenNameAndSymbol(blockchainName, claimedTokenAddress, null);
    const bridgeContract = this.blockchains[blockchainName].bridgeContract.connect(this.blockchains[blockchainName].defaultWallet);

    console.log(`Successfully claimed: ${amount}${tokenSymbol}`);
    console.log(`Remaining wrapper token amount to be claimed: ${await bridgeContract.claimableFor(amountOwner, claimedTokenAddress)}${tokenSymbol}`);
  }

  public async handleTokenBurnedEvent(blockchainName: string, amountOwner: string, sourceTokenAddress: string, burnedTokenAddress: string, amount: BigNumber) {
    console.log(`Handling ${blockchainName}'s TokenBurned event...`);
    const { tokenSymbol: wrapperTokenSymbol } = await this.getTokenNameAndSymbol(blockchainName, burnedTokenAddress, null);
    console.log(`User with address: ${amountOwner} has successfully burnt ${amount}${wrapperTokenSymbol} in ${blockchainName}'s bridge!`);

    const oppositeBlockchainName = this.getOppositeBlockchain(blockchainName);
    const { tokenName, tokenSymbol } = await this.getTokenNameAndSymbol(oppositeBlockchainName, sourceTokenAddress, null);

    const oppositeBridgeContract = this.blockchains[oppositeBlockchainName].bridgeContract.connect(this.blockchains[oppositeBlockchainName].defaultWallet);
    console.log(`Adding tokens to be released in ${oppositeBlockchainName}'s bridge for user with address: ${amountOwner}...`);
    const tx = await oppositeBridgeContract.addRelease(amountOwner, sourceTokenAddress, amount);
    await tx;
    console.log(`Successfully added amount to be released for ${tokenName}: ${amount}${tokenSymbol}`);
    console.log(`All token amount to be released for user ${amountOwner}: ${await oppositeBridgeContract.releasableFor(amountOwner, sourceTokenAddress)}${tokenSymbol}`);
  }

  public async handleTokenReleasedEvent(blockchainName: string, amountOwner: string, releasedTokenAddress: string, amount: BigNumber) {
    console.log(`Handling ${blockchainName}'s TokenReleased event...`);
    const { tokenSymbol } = await this.getTokenNameAndSymbol(blockchainName, releasedTokenAddress, null);
    console.log(`User with address: ${amountOwner} has successfully released ${amount}${tokenSymbol} from ${blockchainName}'s bridge!`);
  }

  public async getTokenNameAndSymbol(blockchainName: string, tokenAddress: string, privateKey: string) {
    const { tokenContract, } = this.getAndConnectTokenContract(blockchainName, tokenAddress, privateKey, ERC20__factory.abi);
    const tokenName = await tokenContract.name();
    const tokenSymbol = await tokenContract.symbol();
    return { tokenName, tokenSymbol };
  }

  public getOppositeBlockchain(blockchainName: string): string {
    if (blockchainName === process.env.BLOCKHAIN_NAME_1) {
      return process.env.BLOCKHAIN_NAME_2;
    }
    if (blockchainName === process.env.BLOCKHAIN_NAME_2) {
      return process.env.BLOCKHAIN_NAME_1;
    }
    return "";
  }
}
