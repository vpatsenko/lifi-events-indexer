import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { FeesCollectedModel } from '../models/FeesCollected';
import { FeesCollectedRepository } from './repository';

jest.mock('mongoose', () => ({
  connect: jest.fn(),
  disconnect: jest.fn()
}));

jest.mock('../models/FeesCollected', () => {
  const mockExec = jest.fn();

  return {
    FeesCollectedModel: {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({ exec: mockExec })
          }),
          skip: jest.fn().mockReturnValue({ exec: mockExec }),
          exec: mockExec,
          select: jest.fn().mockReturnValue({ exec: mockExec })
        })
      }),
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({ exec: mockExec })
          }),
          skip: jest.fn().mockReturnValue({ exec: mockExec }),
          exec: mockExec,
          select: jest.fn().mockReturnValue({ exec: mockExec })
        })
      }),
      findById: jest.fn().mockReturnValue({ exec: mockExec }),
      insertMany: jest.fn()
    },
    FeesCollectedEvent: jest.fn()
  };
});

describe('FeesCollectedRepository', () => {
  let repository: FeesCollectedRepository;
  const mockMongoUri = 'mongodb://localhost:27017/test';
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
    repository = new FeesCollectedRepository(mockMongoUri);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('connect', () => {
    it('should connect to MongoDB successfully', async () => {
      (mongoose.connect as jest.Mock).mockResolvedValueOnce(undefined as never);

      const result = await repository.connect();

      expect(mongoose.connect).toHaveBeenCalledWith(mockMongoUri);
      expect(result.isOk()).toBe(true);
    });

    it('should return error when connection fails', async () => {
      const error = new Error('Connection failed');
      (mongoose.connect as jest.Mock).mockRejectedValueOnce(error as never);

      const result = await repository.connect();

      expect(mongoose.connect).toHaveBeenCalledWith(mockMongoUri);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('CONNECTION_ERROR');
        expect(result.error.message).toContain('Failed to connect to MongoDB');
      }
    });
  });

  describe('createMany', () => {
    it('should create many events successfully', async () => {
      (FeesCollectedModel.insertMany as jest.Mock).mockResolvedValueOnce(mockEvents as never);

      const result = await repository.createMany(mockEvents);

      expect(FeesCollectedModel.insertMany).toHaveBeenCalledWith(mockEvents, { ordered: false });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockEvents);
      }
    });

    it('should return error when createMany fails', async () => {
      const error = new Error('Insert failed');
      (FeesCollectedModel.insertMany as jest.Mock).mockRejectedValueOnce(error as never);

      const result = await repository.createMany(mockEvents);

      expect(FeesCollectedModel.insertMany).toHaveBeenCalledWith(mockEvents, { ordered: false });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('OPERATION_ERROR');
        expect(result.error.message).toContain('Failed to create events');
      }
    });
  });

  describe('findAll', () => {
    it('should return all events with pagination', async () => {
      const limit = 10;
      const skip = 0;

      const sortMock = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValueOnce(mockEvents as never)
          })
        })
      });

      (FeesCollectedModel.find as jest.Mock).mockReturnValueOnce({
        sort: sortMock
      });

      const result = await repository.findAll(limit, skip);

      expect(FeesCollectedModel.find).toHaveBeenCalledTimes(1);
      expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockEvents);
      }
    });

    it('should apply limit and skip parameters correctly', async () => {
      const limit = 5;
      const skip = 10;
      const singleEvent = [mockEvents[0]];

      const skipMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce(singleEvent as never)
      });

      const limitMock = jest.fn().mockReturnValue({
        skip: skipMock
      });

      const sortMock = jest.fn().mockReturnValue({
        limit: limitMock
      });

      (FeesCollectedModel.find as jest.Mock).mockReturnValueOnce({
        sort: sortMock
      });

      const result = await repository.findAll(limit, skip);

      expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 });
      expect(limitMock).toHaveBeenCalledWith(limit);
      expect(skipMock).toHaveBeenCalledWith(skip);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(singleEvent);
      }
    });

    it('should return error when find operation fails', async () => {
      const error = new Error('Find failed');

      const execMock = jest.fn().mockRejectedValueOnce(error as never);

      const skipMock = jest.fn().mockReturnValue({
        exec: execMock
      });

      const limitMock = jest.fn().mockReturnValue({
        skip: skipMock
      });

      const sortMock = jest.fn().mockReturnValue({
        limit: limitMock
      });

      (FeesCollectedModel.find as jest.Mock).mockReturnValueOnce({
        sort: sortMock
      });

      const result = await repository.findAll(10, 0);

      expect(FeesCollectedModel.find).toHaveBeenCalledTimes(1);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('OPERATION_ERROR');
        expect(result.error.message).toContain('Failed to find event by id');
      }
    });
  });

  describe('findByIntegrator', () => {
    it('should find events by integrator address with pagination', async () => {
      const limit = 10;
      const skip = 0;
      const integratorAddress = '0x456';

      const sortMock = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValueOnce(mockEvents as never)
          })
        })
      });

      (FeesCollectedModel.find as jest.Mock).mockReturnValueOnce({
        sort: sortMock
      });

      const result = await repository.findByIntegrator(integratorAddress, limit, skip);

      expect(FeesCollectedModel.find).toHaveBeenCalledWith({ integratorAddress });
      expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 });
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(mockEvents);
      }
    });

    it('should apply custom limit and skip parameters correctly', async () => {
      const limit = 5;
      const skip = 10;
      const integratorAddress = '0x456';
      const singleEvent = [mockEvents[0]];

      const skipMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValueOnce(singleEvent as never)
      });

      const limitMock = jest.fn().mockReturnValue({
        skip: skipMock
      });

      const sortMock = jest.fn().mockReturnValue({
        limit: limitMock
      });

      (FeesCollectedModel.find as jest.Mock).mockReturnValueOnce({
        sort: sortMock
      });

      const result = await repository.findByIntegrator(integratorAddress, limit, skip);

      expect(FeesCollectedModel.find).toHaveBeenCalledWith({ integratorAddress });
      expect(sortMock).toHaveBeenCalledWith({ timestamp: -1 });
      expect(limitMock).toHaveBeenCalledWith(limit);
      expect(skipMock).toHaveBeenCalledWith(skip);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(singleEvent);
      }
    });

    it('should return error when find operation fails', async () => {
      const error = new Error('Find failed');
      const integratorAddress = '0x456';

      const execMock = jest.fn().mockRejectedValueOnce(error as never);

      const skipMock = jest.fn().mockReturnValue({
        exec: execMock
      });

      const limitMock = jest.fn().mockReturnValue({
        skip: skipMock
      });

      const sortMock = jest.fn().mockReturnValue({
        limit: limitMock
      });

      (FeesCollectedModel.find as jest.Mock).mockReturnValueOnce({
        sort: sortMock
      });

      const result = await repository.findByIntegrator(integratorAddress);

      expect(FeesCollectedModel.find).toHaveBeenCalledWith({ integratorAddress });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe('OPERATION_ERROR');
        expect(result.error.message).toContain('Failed to find events by integrator');
      }
    });
  });
});
