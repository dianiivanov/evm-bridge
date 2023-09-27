import { Module } from '@nestjs/common';
import { EventsModule } from '../api/events/events.module';
import { BridgeIndexer } from './bridge.indexer';
import { DatabaseConfigModule } from '../database/database-config/database-config.module';
import { ConfigModule } from '@nestjs/config/dist';
import { CommandsModule } from '../cli/commands.module';


@Module({
  imports: [ConfigModule.forRoot(),
    EventsModule, CommandsModule, DatabaseConfigModule
  ],
  providers: [BridgeIndexer],
})
export class IndexerModule { }
