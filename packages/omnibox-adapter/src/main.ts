import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Enable CORS
  app.enableCors();

  const port = parseInt(process.env.PORT || '5001', 10);
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);

  logger.log('=====================================');
  logger.log('  OmniBox Adapter Service Started');
  logger.log('=====================================');
  logger.log(`  Port: ${port}`);
  logger.log(`  OmniBox URL: ${process.env.OMNIBOX_URL || 'http://omnibox:5000'}`);
  logger.log(`  OmniParser URL: ${process.env.OMNIPARSER_URL || 'http://bytebot-omniparser:9989'}`);
  logger.log('=====================================');
}

bootstrap();
