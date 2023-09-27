import { Module } from '@nestjs/common';
import { LockCommand, ClaimableForCommand, LogBalanceCommand, ClaimCommand, MintTokensCommand, BurnCommand, ReleaseCommand, ReleasableForCommand } from './app.commands';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { BlockchainService } from './blockchain.service';

@Module({
    imports: [ConfigModule.forRoot({
        isGlobal: true,
    })],
    providers: [
        BlockchainService,
        LockCommand,
        BurnCommand,
        ReleaseCommand,
        ClaimCommand,
        MintTokensCommand,
        ClaimableForCommand,
        ReleasableForCommand,
        LogBalanceCommand
    ],
    exports: [BlockchainService]
})
export class CommandsModule {

}
