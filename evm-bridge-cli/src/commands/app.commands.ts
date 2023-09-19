// lock.command.ts

import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import * as dotenv from "dotenv";
dotenv.config();
import {Bridge, Bridge__factory, IERC20__factory, SourceToken__factory}  from '../typechain-types';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const INFURA_SEPOLIA_URL = `${process.env.INFURA_SEPOLIA_URL}${process.env.INFURA_API_KEY}`
const INFURA_GOERLI_URL = `${process.env.INFURA_GOERLI_URL}${process.env.INFURA_API_KEY}`;
const BLOCKCHAIN_URL_1 = process.env.BLOCKCHAIN_URL_1;
const BRIDGE_ADDRESS_1 = process.env.BRIDGE_ADDRESS_1;

const BLOCKCHAIN_URL_2 = process.env.BLOCKCHAIN_URL_2;
const BRIDGE_ADDRESS_2 = process.env.BRIDGE_ADDRESS_2;

const BLOCKHAIN_NAME_1 = process.env.BLOCKHAIN_NAME_1;
const BLOCKHAIN_NAME_2 = process.env.BLOCKHAIN_NAME_2;

const networksConfig = {
  [process.env.BLOCKHAIN_NAME_1]: {
      url: process.env.BLOCKCHAIN_URL_1,
      bridgeAddress: BRIDGE_ADDRESS_1,
      bridgeContract: new ethers.Contract(
        BRIDGE_ADDRESS_1,
        Bridge__factory.abi,
      ),
      provider: new ethers.JsonRpcProvider(BLOCKCHAIN_URL_1)
  },
  [process.env.BLOCKHAIN_NAME_2]: {
      url: process.env.BLOCKCHAIN_URL_2,
      bridgeAddress: BRIDGE_ADDRESS_2,
      bridgeContract: new ethers.Contract(
        BRIDGE_ADDRESS_2,
        Bridge__factory.abi,
      ),
      provider: new ethers.JsonRpcProvider(BLOCKCHAIN_URL_2)
  },
};

const wallet = new ethers.Wallet(PRIVATE_KEY);

interface BasicCommandOptions {
  privatekey?: string;
  number?: number;
}

export abstract class AbstractCommand extends CommandRunner {
  @Option({
    flags: '-pk, --privatekey [string]',
    description: 'The private key to use for the command',
  })
  getPrivateKey(privateKey: string): string {
    return privateKey;
  }
}
//The wrapped token is at address: 0xa16E02E87b7454126E5E10d957A927A7F5B5d2be
@Injectable()
@Command({ name: 'lock', description: 'A parameter parse' })
export class LockCommand extends AbstractCommand{
  constructor() {
    super();
  }

  async run(
    [blockchainName, tokenAddress, amountToLock, ...others]: string[],
    options?:BasicCommandOptions,
  ) {
    const provider = networksConfig[blockchainName].provider;
    const privateKey: string = options.privatekey || PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    const bridgeContract = networksConfig[blockchainName].bridgeContract.connect(wallet) as Bridge;
    const tokenContract = new ethers.Contract(
        tokenAddress,
        IERC20__factory.abi,
        wallet
    );

    const approveTx = await tokenContract.approve(networksConfig[blockchainName].bridgeAddress, amountToLock);
    await approveTx.wait();

    const transaction = await bridgeContract.lock(tokenAddress, amountToLock);
    await transaction.wait();

    console.log(`Locked ${amountToLock} tokens successfully!`)
  }
}


@Injectable()
@Command({ name: 'claim', description: 'A parameter parse' })
export class ClaimCommand extends AbstractCommand{
  constructor() {
    super();
  }

  async run(
    [blockchainName, tokenAddress, amountToClaim, ...others]: string[],
    options?:BasicCommandOptions,
  ) {
    const provider = networksConfig[blockchainName].provider;
    const privateKey: string = options.privatekey || PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    const bridgeContract = networksConfig[blockchainName].bridgeContract.connect(wallet) as Bridge;

    const transaction = await bridgeContract.claim(tokenAddress, amountToClaim);
    await transaction.wait();
    
    const wrappedTokenAddress = await bridgeContract.baseToWrappedToken(tokenAddress);
    console.log("Claimed successfully");
    console.log(`The wrapped token is at address: ${wrappedTokenAddress}`);
  }
}

@Injectable()
@Command({ name: 'burn', description: 'A parameter parse' })
export class BurnCommand extends AbstractCommand{
  constructor() {
    super();
  }

  async run(
    [blockchainName, tokenAddress, amountToBurn, ...others]: string[],
    options?:BasicCommandOptions,
  ) {
    const provider = networksConfig[blockchainName].provider;
    const privateKey: string = options.privatekey || PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    const bridgeContract = networksConfig[blockchainName].bridgeContract.connect(wallet) as Bridge;
    
    const transaction = await bridgeContract.burn(tokenAddress, amountToBurn);
    const receipt = await transaction.wait();

    console.log(`Burned ${amountToBurn} tokens successfully!`)
  }
}


@Injectable()
@Command({ name: 'release', description: 'A parameter parse' })
export class ReleaseCommand extends AbstractCommand{
  constructor() {
    super();
  }

  async run(
    [blockchainName, tokenAddress, amountToRelease, ...others]: string[],
    options?:BasicCommandOptions,
  ) {
    const provider = networksConfig[blockchainName].provider;
    const privateKey: string = options.privatekey || PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    const bridgeContract = networksConfig[blockchainName].bridgeContract.connect(wallet) as Bridge;

    const transaction = await bridgeContract.release(tokenAddress, amountToRelease);
    const receipt = await transaction.wait();
    console.log(`Released ${amountToRelease} tokens successfully!`)
}
}


@Injectable()
@Command({ name: 'mint', description: 'A parameter parse',  options: { isDefault: true }  })
export class PrintTokensCommand extends AbstractCommand{
  constructor() {
    super();
  }
  

  async run(
    [blockchainName, tokenAddress,amount, ...others]: string[],
    options?:BasicCommandOptions,
  ) {
    const provider = networksConfig[blockchainName].provider;
    const privateKey: string = options.privatekey || PRIVATE_KEY;
    console.log("OPTIONSSS: !!!!!!!!!!!!!!!!! -> ", options);

    const wallet = new ethers.Wallet(privateKey, provider);
    const tokenContract = new ethers.Contract(
        tokenAddress,
        SourceToken__factory.abi,
        wallet
    );

    const balanceBeforeMint = await tokenContract.balanceOf(wallet.address);

    console.log(`BEFORE-MINT: Token balance: ${balanceBeforeMint}`);

    const tx = await tokenContract.mint(wallet.address, amount);
    await tx.wait();

    const balanceAfterMint = await tokenContract.balanceOf(wallet.address);

    console.log(`AFTER-MINT: Token balance: ${balanceAfterMint}`);
  }
  
  @Option({
    flags: '-pk, --privatekey <privatekey>',
    description: 'The private key to use for the command',
  })
  getPrivateKey(privateKey: string): string {
    return privateKey;
  }

  @Option({
    flags: '-n, --number [number]',
    description: 'A basic number parser'
  })
  parseNumber(val: string): number {
    return Number(val);
  }
}

@Injectable()
@Command({ name: 'releasable-for', description: 'A parameter parse',  options: { isDefault: true }  })
export class ReleasableForCommand extends AbstractCommand{
  constructor() {
    super();
  }
  

  async run(
    [blockchainName, tokenAddress, ...others]: string[],
    options?:BasicCommandOptions,
  ) {
    console.log(networksConfig);
    const provider = networksConfig[blockchainName].provider;
    const privateKey: string = options.privatekey || PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, provider);
    const bridgeContract = networksConfig[blockchainName].bridgeContract.connect(wallet) as Bridge;

    const amountAbleToRelease = await bridgeContract.releasableFor(wallet.address, tokenAddress);

    console.log(`ReleasableFor = ${amountAbleToRelease}`)
}
}