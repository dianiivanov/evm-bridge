import { ethers, Contract, Wallet } from 'ethers';
import { Bridge__factory } from '../typechain-types';
import { EventService } from '../api/events/events.service';
import { Inject, Injectable } from '@nestjs/common/decorators';
import { TokenLocked } from '../database/entities/tokenlocked.entity';
import { TokenClaimed } from '../database/entities/tokenclaimed.entity';
import { TokenBurned } from '../database/entities/tokenburned.entity';
import { TokenReleased } from '../database/entities/tokenreleased.entity';
import { BlockchainService } from '../cli/blockchain.service';
import { ConfigService } from '@nestjs/config';
import { OnModuleInit } from '@nestjs/common';

@Injectable()
export class BridgeIndexer implements OnModuleInit {
    private bridgeContract1: Contract;
    private bridgeContract2: Contract;

    private BLOCKHAIN_NAME_1 = this.configService.get<string>('BLOCKHAIN_NAME_1');
    private BLOCKHAIN_NAME_2 = this.configService.get<string>('BLOCKHAIN_NAME_2');

    constructor(
        @Inject(EventService)
        private readonly eventService: EventService,
        @Inject(BlockchainService)
        private readonly blockchainService: BlockchainService,
        @Inject(ConfigService)
        private readonly configService: ConfigService
    ) { }

    onModuleInit() {
        const PRIVATE_KEY = this.configService.get<string>('PRIVATE_KEY');
        const BLOCKCHAIN_URL_1 = this.configService.get<string>('BLOCKCHAIN_URL_1');
        const BRIDGE_ADDRESS_1 = this.configService.get<string>('BRIDGE_ADDRESS_1');

        const BLOCKCHAIN_URL_2 = this.configService.get<string>('BLOCKCHAIN_URL_2');
        const BRIDGE_ADDRESS_2 = this.configService.get<string>('BRIDGE_ADDRESS_2');

        const sourceProvider = new ethers.JsonRpcProvider(BLOCKCHAIN_URL_1);
        const sourceWallet = new Wallet(PRIVATE_KEY, sourceProvider);

        this.bridgeContract1 = new Contract(
            BRIDGE_ADDRESS_1,
            Bridge__factory.abi,
            sourceWallet
        );

        const targetProvider = new ethers.JsonRpcProvider(BLOCKCHAIN_URL_2);
        const targetWallet = new Wallet(PRIVATE_KEY, targetProvider);

        this.bridgeContract2 = new Contract(
            BRIDGE_ADDRESS_2,
            Bridge__factory.abi,
            targetWallet
        );
    }

    async main() {
        this.bridgeContract1.on("TokenLocked", async (amountOwner, lockedTokenAddress, amount, event) => {
            this.blockchainService.handleTokenLockedEvent(this.BLOCKHAIN_NAME_1, amountOwner, lockedTokenAddress, amount);
            this.eventService.saveTokenLocked(new TokenLocked(amountOwner, lockedTokenAddress, amount, this.BLOCKHAIN_NAME_1));
        });

        this.bridgeContract2.on("TokenLocked", async (amountOwner, lockedTokenAddress, amount, event) => {
            this.blockchainService.handleTokenLockedEvent(this.BLOCKHAIN_NAME_2, amountOwner, lockedTokenAddress, amount);
            this.eventService.saveTokenLocked(new TokenLocked(amountOwner, lockedTokenAddress, amount, this.BLOCKHAIN_NAME_2));
        });

        this.bridgeContract1.on("TokenClaimed", async (amountOwner, sourceTokenAddress, claimedTokenAddress, amount, event) => {
            this.blockchainService.handleTokenClaimedEvent(this.BLOCKHAIN_NAME_1, amountOwner, claimedTokenAddress, amount);
            this.eventService.saveTokenClaimed(new TokenClaimed(amountOwner, sourceTokenAddress, claimedTokenAddress, amount, this.BLOCKHAIN_NAME_1));
        });

        this.bridgeContract2.on("TokenClaimed", async (amountOwner, sourceTokenAddress, claimedTokenAddress, amount, event) => {
            this.blockchainService.handleTokenClaimedEvent(this.BLOCKHAIN_NAME_2, amountOwner, claimedTokenAddress, amount);
            this.eventService.saveTokenClaimed(new TokenClaimed(amountOwner, sourceTokenAddress, claimedTokenAddress, amount, this.BLOCKHAIN_NAME_2));
        });

        this.bridgeContract1.on("TokenBurned", async (amountOwner, sourceTokenAddress, burnedTokenAddress, amount, event) => {
            this.blockchainService.handleTokenBurnedEvent(this.BLOCKHAIN_NAME_1, amountOwner, sourceTokenAddress, burnedTokenAddress, amount);
            this.eventService.saveTokenBurned(new TokenBurned(amountOwner, sourceTokenAddress, burnedTokenAddress, amount, this.BLOCKHAIN_NAME_1));
        });

        this.bridgeContract2.on("TokenBurned", async (amountOwner, sourceTokenAddress, burnedTokenAddress, amount, event) => {
            this.blockchainService.handleTokenBurnedEvent(this.BLOCKHAIN_NAME_2, amountOwner, sourceTokenAddress, burnedTokenAddress, amount);
            this.eventService.saveTokenBurned(new TokenBurned(amountOwner, sourceTokenAddress, burnedTokenAddress, amount, this.BLOCKHAIN_NAME_2));
        });

        this.bridgeContract1.on("TokenReleased", async (amountOwner, releasedTokenAddress, amount, event) => {
            this.blockchainService.handleTokenReleasedEvent(this.BLOCKHAIN_NAME_1, amountOwner, releasedTokenAddress, amount);
            this.eventService.saveTokenReleased(new TokenReleased(amountOwner, releasedTokenAddress, amount, this.BLOCKHAIN_NAME_1));
        });

        this.bridgeContract2.on("TokenReleased", async (amountOwner, releasedTokenAddress, amount, event) => {
            this.blockchainService.handleTokenReleasedEvent(this.BLOCKHAIN_NAME_2, amountOwner, releasedTokenAddress, amount);
            this.eventService.saveTokenReleased(new TokenReleased(amountOwner, releasedTokenAddress, amount, this.BLOCKHAIN_NAME_2));
        });
    }

}