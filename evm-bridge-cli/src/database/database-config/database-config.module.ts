import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenBurned } from '../entities/tokenburned.entity';
import { TokenClaimed } from '../entities/tokenclaimed.entity';
import { TokenReleased } from '../entities/tokenreleased.entity';
import { TokenLocked } from '../entities/tokenlocked.entity';
import { databaseConfig } from './database.config'



@Module({
  imports: [TypeOrmModule.forRoot({
    ...databaseConfig,
    autoLoadEntities: true,
    entities: [TokenBurned, TokenClaimed, TokenLocked, TokenReleased],
  })],
  exports: [TypeOrmModule],
})
export class DatabaseConfigModule { }
