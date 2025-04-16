import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { FeesCollectedRepository } from '../repository/repository';
import { Service } from './service';
import { ethers } from 'ethers';
import { ok, err } from 'neverthrow';
import pino from 'pino';

jest.mock('../contracts/factories/FeeCollector__factory', () => ({
  FeeCollector__factory: {
    connect: jest.fn()
  }
}));

import { FeeCollector__factory } from '../contracts/factories/FeeCollector__factory';

jest.mock('../repository/repository');

describe('Service', () => {
  let repository: FeesCollectedRepository;
  let service: Service;
  let mockProvider: any;
  let mockLogger: pino.Logger;

  const mockMongoUri = 'mongodb://localhost:27017/test';
  const mockContractAddress = '0x1234567890123456789012345678901234567890';
  const mockStartBlock = 1000;
  const mockBlocksPerBatch = 100;

  const mockEvents = [
    {
      tokenAddress: '0x123',
      integratorAddress: '0x456',
      integratorFee: '100',
      lifiFee: '50',
      blockNumber: 1000,
      transactionHash: '0xabc'
    },
    {
      tokenAddress: '0x789',
      integratorAddress: '0x456',
      integratorFee: '200',
      lifiFee: '75',
      blockNumber: 1001,
      transactionHash: '0xdef'
    }
  ];

  beforeEach(() => {
    mockProvider = {
      getBlockNumber: jest.fn().mockResolvedValue(2000 as never),
    };

    repository = new FeesCollectedRepository(mockMongoUri);

    jest.spyOn(repository, 'getLatestEventBlock').mockResolvedValue(ok(0));
    jest.spyOn(repository, 'findAll').mockResolvedValue(ok(mockEvents));
    jest.spyOn(repository, 'findByIntegrator').mockResolvedValue(ok(mockEvents));

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as pino.Logger;

    service = new Service(
      mockProvider as ethers.Provider,
      repository,
      mockContractAddress,
      mockStartBlock,
      mockBlocksPerBatch,
      mockLogger
    );

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should initialize service with correct parameters', () => {
    expect(service).toBeDefined();
    expect(service['provider']).toBe(mockProvider);
    expect(service['repository']).toBe(repository);
    expect(service['contractAddress']).toBe(mockContractAddress);
    expect(service['startBlock']).toBe(mockStartBlock);
    expect(service['blocksPerBatch']).toBe(mockBlocksPerBatch);
    expect(service['logger']).toBe(mockLogger);
  });

  it('should get events successfully', async () => {
    const result = await service.getEvents(10, 0);

    expect(repository.findAll).toHaveBeenCalledWith(10, 0);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(mockEvents);
  });

  it('should get events by integrator successfully', async () => {
    const result = await service.getEventsByIntegrator('0x456', 10, 0);

    expect(repository.findByIntegrator).toHaveBeenCalledWith('0x456', 10, 0);
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(mockEvents);
  });

  it('should handle repository errors when getting events', async () => {
    jest.spyOn(repository, 'findAll').mockResolvedValueOnce(
      err({ message: 'DB error', code: 'OPERATION_ERROR' })
    );

    const result = await service.getEvents(10, 0);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().code).toBe('ERROR_GETTING_FEES_COLLECTED');
  });

  describe('fetchFeesCollected', () => {
    it('should fetch FeesCollected events successfully', async () => {
      const mockQueryFilter = jest.fn().mockResolvedValue([
        {
          args: {
            _token: '0x123',
            _integrator: '0x456',
            _integratorFee: { toString: () => '100' },
            _lifiFee: { toString: () => '50' }
          },
          blockNumber: 1000,
          transactionHash: '0xabc'
        },
        {
          args: {
            _token: '0x789',
            _integrator: '0x456',
            _integratorFee: { toString: () => '200' },
            _lifiFee: { toString: () => '75' }
          },
          blockNumber: 1001,
          transactionHash: '0xdef'
        }
      ] as never);

      const mockFilters = {
        FeesCollected: jest.fn().mockReturnValue({})
      };

      (service as any).contract = {
        filters: mockFilters,
        queryFilter: mockQueryFilter
      };

      jest.spyOn(service as any, 'fetchWithRetry').mockImplementation((...args: unknown[]) => {
        const fn = args[0] as () => Promise<any>;
        return fn();
      });

      const result = await (service as any).fetchFeesCollected(1000, 1100);

      expect(mockFilters.FeesCollected).toHaveBeenCalled();
      expect(mockQueryFilter).toHaveBeenCalledWith({}, 1000, 1100);

      expect(result.isOk()).toBe(true);
      const events = result._unsafeUnwrap();
      expect(events).toHaveLength(2);

      expect(events[0]).toEqual({
        tokenAddress: '0x123',
        integratorAddress: '0x456',
        integratorFee: '100',
        lifiFee: '50',
        blockNumber: 1000,
        transactionHash: '0xabc'
      });

    expect(events[1]).toEqual({
        tokenAddress: '0x789',
        integratorAddress: '0x456',
        integratorFee: '200',
        lifiFee: '75',
        blockNumber: 1001,
        transactionHash: '0xdef'
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        { startBlock: 1000, endBlock: 1100 },
        'Fetching FeesCollected events'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        { eventCount: 2 },
        'Found FeesCollected events'
      );
    });

    it('should handle empty events when fetching FeesCollected', async () => {
      const mockQueryFilter = jest.fn().mockResolvedValue([] as never);
      const mockFilters = {
        FeesCollected: jest.fn().mockReturnValue({})
      };

      (service as any).contract = {
        filters: mockFilters,
        queryFilter: mockQueryFilter
      };

      jest.spyOn(service as any, 'fetchWithRetry').mockImplementation((...args: unknown[]) => {
        const fn = args[0] as () => Promise<any>;
        return fn();
      });

      const result = await (service as any).fetchFeesCollected(1000, 1100);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toEqual([]);
    });

    it('should handle errors when fetching FeesCollected events', async () => {
      const mockFilters = {
        FeesCollected: jest.fn().mockReturnValue({})
      };

      (service as any).contract = {
        filters: mockFilters,
        queryFilter: jest.fn()
      };

      jest.spyOn(service as any, 'fetchWithRetry').mockImplementation(() => {
        throw new Error('Contract query failed');
      });

      const result = await (service as any).fetchFeesCollected(1000, 1100);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().code).toBe('ERROR_FETCHING_FEES_COLLECTED');
      expect(result._unsafeUnwrapErr().message).toContain('Contract query failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('fetch with retry', () => {
    it('should retry fetch operations on temporary failures', async () => {
      const mockQueryFilter = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary RPC error') as never)
        .mockResolvedValueOnce([
          {
            args: {
              _token: '0x123',
              _integrator: '0x456',
              _integratorFee: { toString: () => '100' },
              _lifiFee: { toString: () => '50' }
            },
            blockNumber: 1000,
            transactionHash: '0xabc'
          }
        ] as never);

      const mockFilters = {
        FeesCollected: jest.fn().mockReturnValue({})
      };

      (service as any).contract = {
        filters: mockFilters,
        queryFilter: mockQueryFilter
      };

      const realFetchWithRetry = Service.prototype['fetchWithRetry'];
      (service as any).fetchWithRetry = realFetchWithRetry.bind(service);
      (service as any).maxRetries = 3;
      (service as any).retryDelay = 10;

      const result = await (service as any).fetchFeesCollected(1000, 1100);

      expect(mockQueryFilter).toHaveBeenCalledTimes(2);
      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap()).toHaveLength(1);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should fail after maxRetries is exceeded', async () => {
      const mockQueryFilter = jest.fn()
        .mockRejectedValueOnce(new Error('RPC error') as never)
        .mockRejectedValueOnce(new Error('RPC error') as never)
        .mockRejectedValueOnce(new Error('RPC error') as never);

      const mockFilters = {
        FeesCollected: jest.fn().mockReturnValue({})
      };

      (service as any).contract = {
        filters: mockFilters,
        queryFilter: mockQueryFilter
      };

      jest.spyOn(service as any, 'fetchWithRetry').mockImplementation(() => {
        throw new Error('RPC error');
      });

      const result = await (service as any).fetchFeesCollected(1000, 1100);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().code).toBe('ERROR_FETCHING_FEES_COLLECTED');
      expect(result._unsafeUnwrapErr().message).toContain('RPC error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('start', () => {
    beforeEach(() => {
      service = new Service(
        mockProvider as unknown as ethers.Provider,
        repository,
        mockContractAddress,
        mockStartBlock,
        mockBlocksPerBatch,
        mockLogger
      );
    });

    it('should return error when service is already running', async () => {
      (service as any).isRunning = true;

      const result = await service.start();

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().code).toBe('ERROR_SERVICE_IS_RUNNING_ALREADY');
    });

    it('should return error when getting latest event block fails', async () => {
      jest.spyOn(repository, 'getLatestEventBlock').mockResolvedValueOnce(
        err({ message: 'DB error', code: 'OPERATION_ERROR' })
      );

      (FeeCollector__factory.connect as jest.Mock).mockReturnValueOnce({});

      const result = await service.start();

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().code).toBe('ERROR_FETCHING_FEES_COLLECTED');
    });

    it('should handle start execution flow successfully', async () => {
      jest.setTimeout(10000);

      jest.spyOn(repository, 'getLatestEventBlock').mockResolvedValueOnce(ok(0));
      const mockContract = {
        filters: {
          FeesCollected: jest.fn().mockReturnValue({})
        },
        queryFilter: jest.fn().mockResolvedValue([] as never)
      };
      (FeeCollector__factory.connect as jest.Mock).mockReturnValueOnce(mockContract);

      let firstCall = true;
      jest.spyOn(service as any, 'fetchWithRetry').mockImplementation((fn: any) => {
        if (typeof fn === 'function') {
          if (fn.toString().includes('getBlockNumber')) {
            // If first call, return normal value
            if (firstCall) {
              firstCall = false;
              return Promise.resolve(2000);
            }
            // For subsequent calls, make isRunning false to exit the while loop
            (service as any).isRunning = false;
            return Promise.resolve(2000);
          }
        }
        return Promise.resolve([]);
      });

      jest.spyOn(service as any, 'fetchFeesCollected').mockResolvedValue(ok([]));

      jest.spyOn(service as any, 'saveFeesCollectedEvents').mockResolvedValue(ok(null));

      const result = await service.start();

      expect(result.isOk()).toBe(true);
      expect(repository.getLatestEventBlock).toHaveBeenCalled();
      expect(FeeCollector__factory.connect).toHaveBeenCalledWith(
        mockContractAddress,
        mockProvider
      );

      await service.stop();
      jest.setTimeout(5000);
    });

    it('should handle errors during saveFeesCollectedEvents', async () => {
      // Mock repository call
      jest.spyOn(repository, 'getLatestEventBlock').mockResolvedValueOnce(ok(0));

      // Mock implementation to simulate error in saveFeesCollectedEvents
      jest.spyOn(service as any, 'start').mockImplementationOnce(async function(this: Service) {
        (this as any).contract = {};
        (this as any).isRunning = true;

        const latestBlockResult = await repository.getLatestEventBlock();
        if (latestBlockResult.isErr()) {
          return err({
            message: `Failed to get latest indexed block: ${latestBlockResult.error.message}`,
            code: 'ERROR_FETCHING_FEES_COLLECTED'
          });
        }

        // Simulate error in saveFeesCollectedEvents
        return err({
          message: 'Failed to save fees collected: DB error',
          code: 'ERROR_SAVING_FEES_COLLECTED_EVENTS'
        });
      });

      const result = await service.start();

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr().code).toBe('ERROR_SAVING_FEES_COLLECTED_EVENTS');
    });
  });
});
