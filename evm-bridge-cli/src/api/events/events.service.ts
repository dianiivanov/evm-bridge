import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBurned } from '../../database/entities/tokenburned.entity';
import { TokenClaimed } from '../../database/entities/tokenclaimed.entity';
import { TokenReleased } from '../../database/entities/tokenreleased.entity';
import { TokenLocked } from '../../database/entities/tokenlocked.entity';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class EventService {
  constructor(
    @InjectRepository(TokenLocked)
    private readonly tokenLockedRepository: Repository<TokenLocked>,
    @InjectRepository(TokenClaimed)
    private readonly tokenClaimedRepository: Repository<TokenClaimed>,
    @InjectRepository(TokenBurned)
    private readonly tokenBurnedRepository: Repository<TokenBurned>,
    @InjectRepository(TokenReleased)
    private readonly tokenReleasedRepository: Repository<TokenReleased>,
    private readonly configService: ConfigService
  ) { }


  private BLOCKHAIN_NAME_1 = this.configService.get<string>('BLOCKHAIN_NAME_1');
  private BLOCKHAIN_NAME_2 = this.configService.get<string>('BLOCKHAIN_NAME_2');

  async saveTokenLocked(eventData: TokenLocked): Promise<void> {
    await this.tokenLockedRepository.save(eventData);
  }

  async saveTokenClaimed(eventData: TokenClaimed): Promise<void> {
    await this.tokenClaimedRepository.save(eventData);
  }

  async saveTokenBurned(eventData: TokenBurned): Promise<void> {
    await this.tokenBurnedRepository.save(eventData);
  }

  async saveTokenReleased(eventData: TokenReleased): Promise<void> {
    await this.tokenReleasedRepository.save(eventData);
  }

  async findAllBridgedTokens() {
    const allBridgedTokensChain1 = await this.findAllBridgedTokensByBlockchain(this.BLOCKHAIN_NAME_1);
    const allBridgedTokensChain2 = await this.findAllBridgedTokensByBlockchain(this.BLOCKHAIN_NAME_2);
    return { [this.BLOCKHAIN_NAME_1]: allBridgedTokensChain1, [this.BLOCKHAIN_NAME_2]: allBridgedTokensChain2 };
  }

  async findAllBridgeTokensForWalletAddress(walletAddress: string) {
    const bridgedTokensChain1 = await this.findBridgedTokensByWalletAddressAndBlockchain(
      walletAddress, this.BLOCKHAIN_NAME_1);
    const bridgedTokensChain2 = await this.findBridgedTokensByWalletAddressAndBlockchain(
      walletAddress, this.BLOCKHAIN_NAME_2);
    return { [this.BLOCKHAIN_NAME_1]: bridgedTokensChain1, [this.BLOCKHAIN_NAME_2]: bridgedTokensChain2 };
  }

  async findAllTokensToBeClaimed() {
    const bridgedTokensChain1 = await this.findTokensToBeClaimed(this.BLOCKHAIN_NAME_1);
    const bridgedTokensChain2 = await this.findTokensToBeClaimed(this.BLOCKHAIN_NAME_2);
    return { [this.BLOCKHAIN_NAME_1]: bridgedTokensChain1, [this.BLOCKHAIN_NAME_2]: bridgedTokensChain2 };
  }

  async findAllTokensToBeReleased() {
    const bridgedTokensChain1 = await this.findTokensToBeReleased(this.BLOCKHAIN_NAME_1);
    const bridgedTokensChain2 = await this.findTokensToBeReleased(this.BLOCKHAIN_NAME_2);
    return { [this.BLOCKHAIN_NAME_1]: bridgedTokensChain1, [this.BLOCKHAIN_NAME_2]: bridgedTokensChain2 };
  }

  async findTokensToBeClaimed(blockchainName: string): Promise<any[]> {
    const oppositeBlockchainName = this.getOppositeBlockchain(blockchainName);

    const lockedSubQuery = this.tokenLockedRepository
      .createQueryBuilder("tl")
      .select("tl.lockedTokenAddress", "tokenAddress")
      .addSelect("SUM(tl.amount)", "lockedAmount")
      .where("LOWER(tl.blockchainName) = LOWER(:blockchainName)", { blockchainName })
      .groupBy("tl.lockedTokenAddress");

    const claimedSubQuery = this.tokenClaimedRepository
      .createQueryBuilder('tc')
      .select('"tc"."sourceTokenAddress"', "sourceTokenAddress")
      .addSelect('SUM("tc"."amount")', "claimedAmount")
      .where('"tc"."blockchainName" = :oppositeBlockchainName', { oppositeBlockchainName })
      .groupBy('"tc"."sourceTokenAddress"');

    const allParameters = {
      ...lockedSubQuery.getParameters(),
      ...claimedSubQuery.getParameters()
    };

    const result = await this.tokenLockedRepository.manager
      .createQueryBuilder()
      .select('"locked"."tokenAddress"', "tokenAddress")
      .addSelect('"locked"."lockedAmount"', "totalLockedAmount")
      .addSelect('COALESCE("claimed"."claimedAmount", 0)', "wrapperTotalClaimedAmount")
      .from("(" + lockedSubQuery.getQuery() + ")", "locked")
      .leftJoin("(" + claimedSubQuery.getQuery() + ")", "claimed", '"locked"."tokenAddress" = "claimed"."sourceTokenAddress"')
      .setParameters(allParameters)
      .getRawMany();



    result.forEach(record => {
      record.waitingToBeClaimed = parseFloat(record.totalLockedAmount) - (record.wrapperTotalClaimedAmount ? parseFloat(record.wrapperTotalClaimedAmount) : 0);
    });

    return result;
  }


  async findTokensToBeReleased(blockchainName: string): Promise<any[]> {
    const oppositeBlockchainName = this.getOppositeBlockchain(blockchainName);

    const burnedSubQuery = this.tokenBurnedRepository
      .createQueryBuilder("tb")
      .select("tb.sourceTokenAddress", "tokenAddress")
      .addSelect("SUM(tb.amount)", "burnedAmount")
      .where("LOWER(tb.blockchainName) = LOWER(:blockchainName)", { blockchainName })
      .groupBy("tb.sourceTokenAddress");

    const releasedSubQuery = this.tokenReleasedRepository
      .createQueryBuilder("tr")
      .select("tr.releasedTokenAddress", "tokenAddress")
      .addSelect("SUM(tr.amount)", "releasedAmount")
      .where("tr.blockchainName = :oppositeBlockchainName", { oppositeBlockchainName })
      .groupBy("tr.releasedTokenAddress");


    const allParameters = {
      ...burnedSubQuery.getParameters(),
      ...releasedSubQuery.getParameters()
    };

    const result = await this.tokenBurnedRepository.manager
      .createQueryBuilder()
      .select('"burned"."tokenAddress"', "tokenAddress")
      .addSelect('"burned"."burnedAmount"', "wrapperTotalBurnedAmount")
      .addSelect('COALESCE("released"."releasedAmount", 0)', "totalReleasedAmount")
      .from("(" + burnedSubQuery.getQuery() + ")", "burned")
      .leftJoin("(" + releasedSubQuery.getQuery() + ")", "released", '"burned"."tokenAddress" = "released"."tokenAddress"')
      .setParameters(allParameters)
      .getRawMany();

    result.forEach(record => {
      record.waitingToBeReleased = parseFloat(record.wrapperTotalBurnedAmount) - parseFloat(record.totalReleasedAmount);
    });

    return result;
  }

  async findBridgedTokensByWalletAddressAndBlockchain(walletAddress: string, blockchainName: string): Promise<TokenLocked[]> {
    const result = await this.tokenLockedRepository
      .createQueryBuilder("tokenLocked")
      .select('tokenLocked.lockedTokenAddress', "bridgedTokenAddress").distinct(true)
      .addSelect('sum(tokenLocked.amount)', 'bridgedAmount')
      .where("LOWER(tokenLocked.amountOwner) = LOWER(:walletAddress)", { walletAddress: walletAddress })
      .andWhere("tokenLocked.blockchainName = :blockchainName", { blockchainName: blockchainName })
      .groupBy('tokenLocked.lockedTokenAddress')
      .getRawMany();

    return result;
  }

  async findAllBridgedTokensByBlockchain(blockchainName: string): Promise<TokenLocked[]> {
    const result = await this.tokenLockedRepository
      .createQueryBuilder("tokenLocked")
      .select('tokenLocked.lockedTokenAddress', "bridgedTokenAddress")
      .addSelect('sum(tokenLocked.amount)', 'bridgedAmount')
      .where("tokenLocked.blockchainName = :blockchainName", { blockchainName: blockchainName })
      .groupBy('tokenLocked.lockedTokenAddress')
      .getRawMany();

    return result;
  }

  private getOppositeBlockchain(blockchainName: string): string {
    if (blockchainName === this.BLOCKHAIN_NAME_1) {
      return this.BLOCKHAIN_NAME_2;
    }
    if (blockchainName === this.BLOCKHAIN_NAME_2) {
      return this.BLOCKHAIN_NAME_1;
    }
    return "";
  }
}