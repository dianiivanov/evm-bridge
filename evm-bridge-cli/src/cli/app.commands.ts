import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BigNumber } from 'bignumber.js';

interface BasicCommandOptions {
  privatekey?: string;
  publicKey?: string;
}

const MAX_UINT256 = new BigNumber('115792089237316195423570985008687907853269984665640564039457584007913129639935');

function validateUintForSolidity(number: any) {
  const result = new BigNumber(number);
  if (result.isNegative()) {
    throw new Error(`Value ${number} is negative`)
  }
  if (result.isGreaterThan(MAX_UINT256)) {
    throw new Error(`Value ${number} exceeds maximum uint256`);
  }

}

export abstract class AbstractCommand extends CommandRunner {
  constructor(protected blockchainService: BlockchainService) {
    super();
  }

  @Option({
    flags: '-pk, --privatekey [string]',
    description: 'The private key to use for the command',
  })
  getPrivateKey(privateKey: string): string {
    return privateKey;
  }

  @Option({
    flags: '-pubk, --publicKey [string]',
    description: 'The public key to use for the command',
  })
  getPublicKey(publicKey: string): string {
    return publicKey;
  }
}

@Injectable()
@Command({ name: 'lock', description: 'Locks a given amount of tokens to the given blockchain' })
export class LockCommand extends AbstractCommand {
  constructor(blockchainService: BlockchainService) {
    super(blockchainService);
  }

  async run(
    [blockchainName, tokenAddress, amountToLock]: string[],
    options?: BasicCommandOptions,
  ) {
    validateUintForSolidity(amountToLock);
    await this.blockchainService.lock(blockchainName, tokenAddress, amountToLock, options.privatekey);
  }
}


@Injectable()
@Command({ name: 'claim', description: 'Claims a given amount of tokens from the given blockchain' })
export class ClaimCommand extends AbstractCommand {
  constructor(blockchainService: BlockchainService) {
    super(blockchainService);
  }

  async run(
    [blockchainName, tokenAddress, amountToClaim]: string[],
    options?: BasicCommandOptions,
  ) {
    validateUintForSolidity(amountToClaim);
    await this.blockchainService.claim(blockchainName, tokenAddress, amountToClaim, options.privatekey);
  }
}

@Injectable()
@Command({ name: 'burn', description: 'Burns a given amount of tokens from the given blockchain' })
export class BurnCommand extends AbstractCommand {
  constructor(blockchainService: BlockchainService) {
    super(blockchainService);
  }

  async run(
    [blockchainName, tokenAddress, amountToBurn]: string[],
    options?: BasicCommandOptions,
  ) {
    validateUintForSolidity(amountToBurn);
    this.blockchainService.burn(blockchainName, tokenAddress, amountToBurn, options.privatekey);
  }
}


@Injectable()
@Command({ name: 'release', description: 'Releases a given amount of tokens from the given blockchain' })
export class ReleaseCommand extends AbstractCommand {
  constructor(blockchainService: BlockchainService) {
    super(blockchainService);
  }

  async run(
    [blockchainName, tokenAddress, amountToRelease]: string[],
    options?: BasicCommandOptions,
  ) {
    validateUintForSolidity(amountToRelease);
    this.blockchainService.release(blockchainName, tokenAddress, amountToRelease, options.privatekey);
  }
}

//Helping commands:

@Injectable()
@Command({ name: 'mint', description: 'Mints a given amount of tokens in the given blockchain (helper function, used to test)', options: { isDefault: true } })
export class MintTokensCommand extends AbstractCommand {
  constructor(blockchainService: BlockchainService) {
    super(blockchainService);
  }

  async run(
    [blockchainName, tokenAddress, amount]: string[],
    options?: BasicCommandOptions,
  ) {
    validateUintForSolidity(amount);
    this.blockchainService.mint(blockchainName, tokenAddress, amount, options.privatekey);
  }
}

@Injectable()
@Command({ name: 'log-balance-of', description: 'Logs the balance for the given token in the given blockchain (helper function, used to test)', options: { isDefault: true } })
export class LogBalanceCommand extends AbstractCommand {
  constructor(blockchainService: BlockchainService) {
    super(blockchainService);
  }

  async run(
    [blockchainName, tokenAddress]: string[],
    options?: BasicCommandOptions,
  ) {
    this.blockchainService.logBalanceOf(blockchainName, tokenAddress, options.publicKey, options.privatekey);
  }
}


@Injectable()
@Command({ name: 'log-claimable-for', description: 'Logs the claimable balance for the given token in the given blockchain (helper function, used to test)', options: { isDefault: true } })
export class ClaimableForCommand extends AbstractCommand {
  constructor(blockchainService: BlockchainService) {
    super(blockchainService);
  }

  async run(
    [blockchainName, tokenAddress]: string[],
    options?: BasicCommandOptions,
  ) {
    this.blockchainService.logClaimableFor(blockchainName, tokenAddress, options.publicKey, options.privatekey);
  }
}

@Injectable()
@Command({ name: 'log-releasable-for', description: 'Logs the releasable balance for the given token in the given blockchain (helper function, used to test)', options: { isDefault: true } })
export class ReleasableForCommand extends AbstractCommand {
  constructor(blockchainService: BlockchainService) {
    super(blockchainService);
  }

  async run(
    [blockchainName, tokenAddress]: string[],
    options?: BasicCommandOptions,
  ) {
    this.blockchainService.logReleasableFor(blockchainName, tokenAddress, options.publicKey, options.privatekey);
  }
}