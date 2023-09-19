import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenBurned } from './entities/tokenburned.entity';
import { TokenClaimed } from './entities/tokenclaimed.entity';
import { TokenReleased } from './entities/tokenreleased.entity';
import { TokenLocked } from './entities/tokenlocked.entity';
import * as dotenv from "dotenv";
dotenv.config();

const BLOCKHAIN_NAME_1 = process.env.BLOCKHAIN_NAME_1;
const BLOCKHAIN_NAME_2 = process.env.BLOCKHAIN_NAME_2;
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
  ) {}

  async createTokenLocked(eventData: TokenLocked): Promise<void> {
    await this.tokenLockedRepository.save(eventData);
  }

  async createTokenClaimed(eventData: TokenClaimed): Promise<void> {
    await this.tokenClaimedRepository.save(eventData);
  }

  async createTokenBurned(eventData: TokenBurned): Promise<void> {
    await this.tokenBurnedRepository.save(eventData);
  }

  async createTokenReleased(eventData: TokenReleased): Promise<void> {
    await this.tokenReleasedRepository.save(eventData);
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
      .createQueryBuilder("tc")
      .select("tc.sourceTokenAddress", "tokenAddress")
      .addSelect("SUM(tc.amount)", "claimedAmount")
      .where("tc.blockchainName = :oppositeBlockchainName", { oppositeBlockchainName })
      .groupBy("tc.sourceTokenAddress");
  
    const result = await this.tokenBurnedRepository.manager
      .createQueryBuilder()
      .select('"locked"."tokenAddress"', "tokenAddress")
      .addSelect('"locked"."lockedAmount"', "totalLockedAmount")
      .addSelect('COALESCE("claimed"."claimedAmount", 0)', "wrapperTotalClaimedAmount")
      .from("(" + lockedSubQuery.getQuery() + ")", "locked")
      .leftJoin("(" + claimedSubQuery.getQuery() + ")", "claimed", '"locked"."tokenAddress" = "claimed"."tokenAddress"')
      .setParameters(lockedSubQuery.getParameters()) // Setting parameters from the subqueries
      .setParameters(claimedSubQuery.getParameters())
      .getRawMany();
  
    // result.forEach(record => {
    //     record.waitingToBeReleased = parseFloat(record.wrapperTotalBurnedAmount) - parseFloat(record.totalReleasedAmount);
    // });
    

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

  const result = await this.tokenBurnedRepository.manager
    .createQueryBuilder()
    .select('"burned"."tokenAddress"', "tokenAddress")
    .addSelect('"burned"."burnedAmount"', "wrapperTotalBurnedAmount")
    .addSelect('COALESCE("released"."releasedAmount", 0)', "totalReleasedAmount")
    .from("(" + burnedSubQuery.getQuery() + ")", "burned")
    .leftJoin("(" + releasedSubQuery.getQuery() + ")", "released", '"burned"."tokenAddress" = "released"."tokenAddress"')
    .setParameters(burnedSubQuery.getParameters()) // Setting parameters from the subqueries
    .setParameters(releasedSubQuery.getParameters())
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
    .where("LOWER(tokenLocked.amountOwner) = LOWER(:walletAddress)", { walletAddress: walletAddress })
    .andWhere("tokenLocked.blockchainName = :blockchainName", { blockchainName: blockchainName })
    .getRawMany();

    return result; 
  }
  
  async findAllBridgedTokensByBlockchain(blockchainName: string): Promise<TokenLocked[]> {
    const result = await this.tokenLockedRepository
    .createQueryBuilder("tokenLocked")
    .select('tokenLocked.lockedTokenAddress', "bridgedTokenAddress").distinct(true)
    .where("tokenLocked.blockchainName = :blockchainName", { blockchainName: blockchainName })
    .getRawMany();

    return result;
  }

  getOppositeBlockchain(blockchainName: string): string {
    if(blockchainName === BLOCKHAIN_NAME_1) {
      return BLOCKHAIN_NAME_2;
    }
    if(blockchainName === BLOCKHAIN_NAME_2) {
      return BLOCKHAIN_NAME_1;
    }
    return "";
  }
}