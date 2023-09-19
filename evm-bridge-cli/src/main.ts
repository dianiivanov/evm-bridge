import { NestFactory } from '@nestjs/core';
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';
import { BridgeListener } from './indexer/bridge.indexer';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // const bridgeListener = app.get(BridgeListener);

  // await bridgeListener.main();


  await app.listen(3000);
}
bootstrap();
