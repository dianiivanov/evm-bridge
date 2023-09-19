import { NestFactory } from '@nestjs/core';
import { CommandFactory } from 'nest-commander';
import { CommandsModule } from './commands/commands.module';
import { LockCommand } from './commands/app.commands';

async function bootstrap() {
  await CommandFactory.run(CommandsModule);
}
bootstrap();
