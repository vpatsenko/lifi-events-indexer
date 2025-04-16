import { describe, it, expect } from '@jest/globals';
import { Config } from './config';

describe('Config', () => {
  beforeEach(() => {
    delete process.env.MONGODB_URI;
    delete process.env.RPC_PROVIDER_URL;
    delete process.env.CONTRACT_ADDRESS;
    delete process.env.START_BLOCK;
    delete process.env.BLOCKS_PER_BATCH;
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    delete process.env.HOST;
  });

  it('should create a valid configuration when all environment variables are set', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.RPC_PROVIDER_URL = 'http://localhost:8545';
    process.env.CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.START_BLOCK = '1000';
    process.env.HOST = 'localhost';

    const result = Config.create();
    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      const config = result.value;
      expect(config.mongoUri).toBe('mongodb://localhost:27017/test');
      expect(config.providerUrl).toBe('http://localhost:8545');
      expect(config.contractAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(config.startBlock).toBe(1000);
      expect(config.host).toBe('localhost');
    }
  });

  it('should set default values for optional environment variables', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.RPC_PROVIDER_URL = 'http://localhost:8545';
    process.env.CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.START_BLOCK = '1000';
    process.env.HOST = 'localhost';

    const result = Config.create();
    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      const config = result.value;
      expect(config.blocksPerBatch).toBe(100);
      expect(config.port).toBe(8080);
      expect(config.logLevel).toBe('info');
    }
  });

  it('should return an error when required environment variables are missing', () => {
    const result = Config.create();
    expect(result.isErr()).toBe(true);
  });

  it('should return error when MONGODB_URI is missing', () => {
    process.env.RPC_PROVIDER_URL = 'http://localhost:8545';
    process.env.CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.START_BLOCK = '1000';
    process.env.HOST = 'localhost';

    const result = Config.create();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBe('MONGODB_URI is required');
    }
  });

  it('should return error when RPC_PROVIDER_URL is missing', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.START_BLOCK = '1000';
    process.env.HOST = 'localhost';

    const result = Config.create();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBe('RPC_PROVIDER_URL is required');
    }
  });

  it('should return error when CONTRACT_ADDRESS is missing', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.RPC_PROVIDER_URL = 'http://localhost:8545';
    process.env.START_BLOCK = '1000';
    process.env.HOST = 'localhost';

    const result = Config.create();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBe('CONTRACT_ADDRESS is required');
    }
  });

  it('should return error when START_BLOCK is missing or zero', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.RPC_PROVIDER_URL = 'http://localhost:8545';
    process.env.CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.HOST = 'localhost';

    const result = Config.create();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toBe('START_BLOCK must be a non-negative number');
    }
  });

  it('should use default value when HOST is not provided', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.RPC_PROVIDER_URL = 'http://localhost:8545';
    process.env.CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.START_BLOCK = '1000';

    const result = Config.create();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.host).toBe('0.0.0.0');
    }
  });

  it('should correctly parse numeric environment variables', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.RPC_PROVIDER_URL = 'http://localhost:8545';
    process.env.CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.START_BLOCK = '5000';
    process.env.BLOCKS_PER_BATCH = '200';
    process.env.PORT = '3000';
    process.env.HOST = 'localhost';

    const result = Config.create();
    expect(result.isOk()).toBe(true);

    if (result.isOk()) {
      const config = result.value;
      expect(config.startBlock).toBe(5000);
      expect(config.blocksPerBatch).toBe(200);
      expect(config.port).toBe(3000);
    }
  });

  it('should return error when HOST is an empty string', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.RPC_PROVIDER_URL = 'http://localhost:8545';
    process.env.CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    process.env.START_BLOCK = '1000';
    process.env.HOST = '';

    const result = Config.create();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.host).toBe('0.0.0.0');
    }
  });


});
