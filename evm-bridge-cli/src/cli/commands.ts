import { CommandFactory } from 'nest-commander';
import { CommandsModule } from './commands.module';

async function bootstrap() {
  await CommandFactory.run(CommandsModule);
}
bootstrap();
