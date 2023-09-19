import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { BridgeListener } from './bridge.indexer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenBurned } from '../events/entities/tokenburned.entity';
import { TokenClaimed } from '../events/entities/tokenclaimed.entity';
import { TokenReleased } from '../events/entities/tokenreleased.entity';
import { TokenLocked } from '../events/entities/tokenlocked.entity';


@Module({imports:[TypeOrmModule.forRoot({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    password: '123',
    username: 'postgres',
    entities: [TokenBurned, TokenClaimed, TokenLocked, TokenReleased],
    database: 'postgres',
    synchronize: true,
    logging: true,
    autoLoadEntities: true,
  }),EventsModule],
    providers: [BridgeListener],
  })
export class IndexerModule {}
