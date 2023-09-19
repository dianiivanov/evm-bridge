import { NestFactory } from '@nestjs/core';
import { BridgeListener } from './indexer/bridge.indexer';
import { IndexerModule } from './indexer/indexer.module';

async function bootstrap() {
  const app = await NestFactory.create(IndexerModule);
  await app.init();
  const bridgeListener = app.get(BridgeListener);

  await bridgeListener.main();
}
bootstrap();
