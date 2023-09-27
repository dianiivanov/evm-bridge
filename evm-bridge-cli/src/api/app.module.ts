import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseConfigModule } from '../database/database-config/database-config.module';
import { EventsModule } from './events/events.module';


@Module({
  imports: [ConfigModule.forRoot(), EventsModule,
    DatabaseConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
