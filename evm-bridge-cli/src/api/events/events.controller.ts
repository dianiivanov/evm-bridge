import { Controller, Get, Param } from '@nestjs/common';
import { EventService } from './events.service';


@Controller('events/tokens')
export class EventsController {
  constructor(private readonly eventService: EventService) { }


  @Get('bridged')
  async getAllBridgedTokens() {
    try {
      return await this.eventService.findAllBridgedTokens();
    } catch (error) {
      return { error: 'An error occurred while fetching all bridged tokens.' };
    }
  }

  @Get('bridged/:walletAddress')
  async findBridgedTokensByWalletAddress(
    @Param('walletAddress') walletAddress: string,
  ) {
    try {
      return await this.eventService.findAllBridgeTokensForWalletAddress(walletAddress);
    } catch (error) {
      return { error: `An error occurred while fetching ${walletAddress}'s bridged tokens.` };
    }
  }


  @Get('to-be-claimed')
  async findTokensToBeClaimed() {
    try {
      return await this.eventService.findAllTokensToBeClaimed();
    } catch (error) {
      return { error: 'An error occurred while fetching tokens waiting to be claimed.' };
    }
  }

  @Get('to-be-released')
  async findTokensToBeReleased() {
    try {
      return await this.eventService.findAllTokensToBeReleased();
    } catch (error) {
      return { error: 'An error occurred while fetching tokens waiting to be released.' };
    }
  }
}
