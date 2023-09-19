import { Module } from '@nestjs/common';
import { CommandsModule } from './commands/commands.module';
import { EventsModule } from './events/events.module';
import { IndexerModule } from './indexer/indexer.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forRoot({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    password: '123',
    username: 'postgres',
    entities: ['dist/**/**/*.entity{.ts,.js}'],
    database: 'postgres',
    synchronize: true,
    logging: true,
    autoLoadEntities: true,
  }),CommandsModule, EventsModule, IndexerModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
