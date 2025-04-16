import { ethers } from 'ethers';
import pino from 'pino';

import { Config } from './config/config';
import { FeesCollectedRepository } from './repository/repository';
import { Server } from './server/server';
import { Service } from './service/service';

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

let shutdownFunc: (() => Promise<void>) | null = null;
let isShuttingDown = false;

async function main(): Promise<void> {
  const config = Config.create();
  if (config.isErr()) {
    logger.error({ error: config.error }, 'Failed to create config');
    return;
  }

  const repository = new FeesCollectedRepository(config.value.mongoUri);
  await repository.connect();

  const provider = new ethers.JsonRpcProvider(config.value.providerUrl);

  const service = new Service(
    provider,
    repository,
    config.value.contractAddress,
    config.value.startBlock,
    config.value.blocksPerBatch,
    logger,
  );

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const server = new Server(config.value.host, config.value.port, service, logger);

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  server.start().then((result) => {
    if (result.isErr()) {
      logger.error({ error: result.error }, 'Failed to start server');
      return;
    }
  });

  const handleShutdown = async (): Promise<void> => {
    if (isShuttingDown || !shutdownFunc) {
      return;
    }
    isShuttingDown = true;
    try {
      await shutdownFunc();
    } catch (error) {
      logger.error({ error }, 'Failed to shutdown gracefully');
      process.exit(1);
    }
  };

  shutdownFunc = async (): Promise<void> => {
    try {
      logger.info('Starting graceful shutdown...');

      const forceExitTimeout = setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 9000); // 9s because docker has timeout of 10s

      logger.info('Stopping HTTP server...');
      const serverStopResult = await server.stop();
      if (serverStopResult.isErr()) {
        logger.error({ error: serverStopResult.error }, 'Failed to stop server');
        throw serverStopResult.error;
      }

      logger.info('Stopping service, waiting for any current batch to complete...');
      await service.stop();

      logger.info('Closing database connection...');
      await repository.disconnect();

      logger.info('Cleaning up provider...');
      provider.destroy();

      clearTimeout(forceExitTimeout);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  // Use proper promise handling for signal handlers
  process.on('SIGINT', () => {
    void handleShutdown();
  });
  process.on('SIGTERM', () => {
    void handleShutdown();
  });

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  service.start().then((runResult) => {
    if (runResult.isErr()) {
      logger.error({ error: runResult.error }, 'Failed to start service');
      return;
    }
  });

  return;
}

main().catch((error: Error) => {
  logger.error({ error }, 'Application failed to start');
  process.exit(1);
});
