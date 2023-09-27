import { NestFactory } from '@nestjs/core';
import { BridgeIndexer } from './bridge.indexer';
import { IndexerModule } from './indexer.module';

async function bootstrap() {
  const app = await NestFactory.create(IndexerModule);
  await app.init();
  const bridgeIndexer = app.get(BridgeIndexer);

  await bridgeIndexer.main();
}
bootstrap();
