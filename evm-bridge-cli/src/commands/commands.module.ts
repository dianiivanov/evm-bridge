import { Module } from '@nestjs/common';
import { LockCommand, ClaimCommand, PrintTokensCommand, BurnCommand, ReleaseCommand, ReleasableForCommand } from './app.commands';


@Module({
    providers: [LockCommand, BurnCommand, ReleaseCommand, ClaimCommand, PrintTokensCommand, ReleasableForCommand],
})
export class CommandsModule {
    
}
