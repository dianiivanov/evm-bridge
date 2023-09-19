import { Module } from '@nestjs/common';
import { EventService } from './events.service';
import { EventsController } from './events.controller';
import { TokenBurned } from './entities/tokenburned.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenClaimed } from './entities/tokenclaimed.entity';
import { TokenReleased } from './entities/tokenreleased.entity';
import { TokenLocked } from './entities/tokenlocked.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TokenBurned,TokenClaimed,TokenReleased,TokenLocked])],
  controllers: [EventsController],
  providers: [EventService],
  exports: [EventService]
})
export class EventsModule {}
