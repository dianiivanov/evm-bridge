import { Module } from '@nestjs/common';
import { EventService } from './events.service';
import { EventsController } from './events.controller';
import { TokenBurned } from '../../database/entities/tokenburned.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenClaimed } from '../../database/entities/tokenclaimed.entity';
import { TokenReleased } from '../../database/entities/tokenreleased.entity';
import { TokenLocked } from '../../database/entities/tokenlocked.entity';
import { ConfigModule } from '@nestjs/config';
import { CommandsModule } from '../../cli/commands.module';

@Module({
  imports: [TypeOrmModule.forFeature([TokenBurned, TokenClaimed, TokenReleased, TokenLocked]),
  ConfigModule.forRoot(),
    CommandsModule],
  controllers: [EventsController],
  providers: [EventService],
  exports: [EventService]
})
export class EventsModule { }
