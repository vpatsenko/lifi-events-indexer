import { ethers } from 'ethers';
import { Result, err, ok } from 'neverthrow';
import pino from 'pino';

import { FeeCollector__factory } from '../contracts/factories/FeeCollector__factory';
import { FeeCollector } from '../contracts/FeeCollector';
import { FeesCollectedEvent } from '../models/FeesCollected';
import { FeesCollectedRepository } from '../repository/repository';

export type ServiceError = {
  message: string;
  code:
    | 'ERROR_STARTING_SERVICE'
    | 'ERROR_SERVICE_IS_RUNNING_ALREADY'
    | 'ERROR_FETCHING_FEES_COLLECTED'
    | 'ERROR_SAVING_FEES_COLLECTED_EVENTS'
    | 'ERROR_GETTING_FEES_COLLECTED_BY_INTEGRATOR'
    | 'ERROR_GETTING_FEES_COLLECTED';
};

export class Service {
  private provider: ethers.Provider;
  private repository: FeesCollectedRepository;
  private contractAddress: string;
  private startBlock: number;
  private blocksPerBatch: number;
  private logger: pino.Logger;
  private maxRetries: number = 5;
  private retryDelay: number = 2000;

  private isRunning = false;
  private processingBatch = false;
  private contract: FeeCollector | null = null;

  constructor(
    provider: ethers.Provider,
    repository: FeesCollectedRepository,
    contractAddress: string,
    startBlock: number,
    blocksPerBatch: number,
    logger: pino.Logger,
  ) {
    this.provider = provider;
    this.contractAddress = contractAddress;
    this.repository = repository;
    this.startBlock = startBlock;
    this.blocksPerBatch = blocksPerBatch;
    this.logger = logger;
  }

  public async start(): Promise<Result<null, ServiceError>> {
    if (this.isRunning) {
      return err({
        message: 'Service is already running',
        code: 'ERROR_SERVICE_IS_RUNNING_ALREADY',
      });
    }

    try {
      this.contract = FeeCollector__factory.connect(this.contractAddress, this.provider);
      this.isRunning = true;

      const latestBlockStored = await this.repository.getLatestEventBlock();
      if (latestBlockStored.isErr()) {
        return err({
          message: `Failed to get latest indexed block: ${latestBlockStored.error.message} ${latestBlockStored.error.code} `,
          code: 'ERROR_FETCHING_FEES_COLLECTED',
        });
      }

      let currentBlock =
        latestBlockStored.value === 0 ? this.startBlock : latestBlockStored.value + 1;

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!this.isRunning) {
          this.logger.info('Service stopped, exiting main loop');
          break;
        }

        const currentChainBlock = await this.fetchWithRetry(
          () => this.provider.getBlockNumber(),
          'Fetching current block number',
        );
        const safeBlock = currentChainBlock - 100; // Consider blocks 100 blocks behind as safe/confirmed

        if (currentBlock >= safeBlock) {
          this.logger.info(
            { safeBlock, currentChainBlock },
            'Reached safe block height, waiting for more confirmations...',
          );
          await new Promise((resolve) => setTimeout(resolve, 10000));
          continue;
        }

        const endBlock = Math.min(currentBlock + this.blocksPerBatch, safeBlock);

        // Mark that we're processing a batch
        this.processingBatch = true;

        this.logger.info({ startBlock: currentBlock, endBlock }, 'Processing batch');
        const feesCollectedEvents = await this.fetchFeesCollected(currentBlock, endBlock);

        // Mark that we've finished processing this batch
        this.processingBatch = false;

        if (feesCollectedEvents.isErr()) {
          this.logger.error(
            { error: feesCollectedEvents.error.message },
            'Failed to fetch fees collected',
          );
          return err({
            message: `Failed to fetch fees collected: ${feesCollectedEvents.error.message} ${feesCollectedEvents.error.code}`,
            code: feesCollectedEvents.error.code,
          });
        }

        const saveResult = await this.saveFeesCollectedEvents(feesCollectedEvents.value);
        if (saveResult.isErr()) {
          this.logger.error({ error: saveResult.error.message }, 'Failed to save fees collected');
          return err({
            message: `Failed to save fees collected: ${saveResult.error.message} ${saveResult.error.code}`,
            code: saveResult.error.code,
          });
        }

        currentBlock = endBlock + 1;

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return ok(null);
    } catch (error) {
      this.isRunning = false;
      this.processingBatch = false;
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to start service',
      );
      return err({
        message: `Failed to start service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'ERROR_STARTING_SERVICE',
      });
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping service, waiting for any current batch to complete...');

    this.isRunning = false;

    if (this.processingBatch) {
      this.logger.info('Current batch in progress, waiting for completion before full shutdown');
      const timeout = 60000; // 60 seconds timeout
      const startTime = Date.now();

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (this.processingBatch && Date.now() - startTime < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.processingBatch = false;
    this.contract = null;
    this.logger.info('Service has been fully stopped');
  }

  public async getEventsByIntegrator(
    integratorAddress: string,
    limit: number,
    skip: number,
  ): Promise<Result<FeesCollectedEvent[], ServiceError>> {
    const events = await this.repository.findByIntegrator(integratorAddress, limit, skip);
    if (events.isErr()) {
      return err({
        message: `Failed to get events by integrator: ${events.error.message}, ${events.error.code}`,
        code: 'ERROR_GETTING_FEES_COLLECTED_BY_INTEGRATOR',
      });
    }

    return ok(events.value);
  }

  public async getEvents(
    limit: number,
    skip: number,
  ): Promise<Result<FeesCollectedEvent[], ServiceError>> {
    const events = await this.repository.findAll(limit, skip);
    if (events.isErr()) {
      return err({
        message: `Failed to get events: ${events.error.message}, ${events.error.code}`,
        code: 'ERROR_GETTING_FEES_COLLECTED',
      });
    }

    return ok(events.value);
  }

  private async fetchFeesCollected(
    startBlock: number,
    endBlock: number,
  ): Promise<Result<FeesCollectedEvent[], ServiceError>> {
    try {
      this.logger.info({ startBlock, endBlock }, 'Fetching FeesCollected events');

      const filter = this.contract!.filters.FeesCollected();
      const events = await this.fetchWithRetry(
        () => this.contract!.queryFilter(filter, startBlock, endBlock),
        'Fetching FeesCollected events',
      );

      this.logger.info({ eventCount: events.length }, 'Found FeesCollected events');

      if (events.length === 0) {
        return ok([]);
      }

      const feesCollectedEvents: FeesCollectedEvent[] = [];
      for (const event of events) {
        const tokenAddress = event.args._token;
        const integratorAddress = event.args._integrator;
        const integratorFee = event.args._integratorFee;
        const lifiFee = event.args._lifiFee;
        const blockNumber = event.blockNumber;

        const feesCollectedEvent: FeesCollectedEvent = {
          tokenAddress,
          integratorFee: integratorFee.toString(),
          lifiFee: lifiFee.toString(),
          blockNumber,
          integratorAddress,
          transactionHash: event.transactionHash,
        };

        feesCollectedEvents.push(feesCollectedEvent);
      }

      return ok(feesCollectedEvents);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to fetch fees collected',
      );
      return err({
        message: `Failed to fetch fees collected: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'ERROR_FETCHING_FEES_COLLECTED',
      });
    }
  }

  private async saveFeesCollectedEvents(
    events: FeesCollectedEvent[],
  ): Promise<Result<null, ServiceError>> {
    const result = await this.repository.createMany(events);
    if (result.isErr()) {
      return err({
        message: `Failed to save fees collected events: ${result.error.message}, ${result.error.code}`,
        code: 'ERROR_SAVING_FEES_COLLECTED_EVENTS',
      });
    }

    return ok(null);
  }

  private async fetchWithRetry<T>(operation: () => Promise<T>, retryMessage: string): Promise<T> {
    let attempts = 0;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      try {
        return await operation();
      } catch (error) {
        attempts++;

        if (attempts >= this.maxRetries) {
          this.logger.error(
            {
              error: error instanceof Error ? error.message : 'Unknown error',
              attempts,
            },
            `${retryMessage} failed after maximum retry attempts`,
          );
          throw error;
        }

        const delay = this.retryDelay * Math.pow(2, attempts - 1);
        this.logger.warn(
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            attempts,
            nextRetryMs: delay,
          },
          `${retryMessage} failed, retrying...`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
}
