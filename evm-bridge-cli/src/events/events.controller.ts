import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EventService } from './events.service';
import * as dotenv from "dotenv";
dotenv.config();

const BLOCKHAIN_NAME_1 = process.env.BLOCKHAIN_NAME_1;
const BLOCKHAIN_NAME_2 = process.env.BLOCKHAIN_NAME_2;

@Controller('events/tokens')
export class EventsController {
  constructor(private readonly eventService: EventService) {}


  @Get('bridged')
  async findAllBridgedTokens() {
    try {
      const allBridgedTokensChain1 = await this.eventService.findAllBridgedTokensByBlockchain(BLOCKHAIN_NAME_1);
      const allBridgedTokensChain2 = await this.eventService.findAllBridgedTokensByBlockchain(BLOCKHAIN_NAME_2);
      return { [BLOCKHAIN_NAME_1]:allBridgedTokensChain1, [BLOCKHAIN_NAME_2]:allBridgedTokensChain2 };
    } catch (error) {
      return { error: 'An error occurred while fetching all bridged tokens.' };
    }
  }
  
  @Get('bridged/:walletAddress')
  async findBridgedTokensByWalletAddress(
    @Param('walletAddress') walletAddress: string,
  ) {
    try {
      const bridgedTokensChain1 = await this.eventService.findBridgedTokensByWalletAddressAndBlockchain(
        walletAddress,BLOCKHAIN_NAME_1);
      const bridgedTokensChain2 = await this.eventService.findBridgedTokensByWalletAddressAndBlockchain(
          walletAddress,BLOCKHAIN_NAME_2);
      return { [BLOCKHAIN_NAME_1]:bridgedTokensChain1, [BLOCKHAIN_NAME_2]:bridgedTokensChain2 };
    } catch (error) {
      return { error: `An error occurred while fetching ${walletAddress}'s bridged tokens.` };
    }
  }

    
  @Get('to-be-claimed')
  async findTokensToBeClaimed() {
    try {
      const bridgedTokensChain1 = await this.eventService.findTokensToBeClaimed(BLOCKHAIN_NAME_1);
      const bridgedTokensChain2 = await this.eventService.findTokensToBeClaimed(BLOCKHAIN_NAME_2);
      return { [BLOCKHAIN_NAME_1]:bridgedTokensChain1, [BLOCKHAIN_NAME_2]:bridgedTokensChain2 };
    } catch (error) {
      return { error: 'An error occurred while fetching tokens waiting to be claimed.' };
    }
  }
      
  @Get('to-be-released')
  async findTokensToBeReleased() {
    try {
      const bridgedTokensChain1 = await this.eventService.findTokensToBeReleased(BLOCKHAIN_NAME_1);
      const bridgedTokensChain2 = await this.eventService.findTokensToBeReleased(BLOCKHAIN_NAME_2);
      return { [BLOCKHAIN_NAME_1]:bridgedTokensChain1, [BLOCKHAIN_NAME_2]:bridgedTokensChain2 };
    } catch (error) {
      return { error: 'An error occurred while fetching tokens waiting to be released.' };
    }
  }
}
