import dotenv from 'dotenv';
import { Result, err, ok } from 'neverthrow';

dotenv.config();

export class Config {
  public readonly mongoUri: string;
  public readonly providerUrl: string;
  public readonly contractAddress: string;
  public readonly startBlock: number;
  public readonly blocksPerBatch: number;
  public readonly port: number;
  public readonly logLevel: string;
  public readonly host: string;

  constructor(
    mongoUri: string,
    providerUrl: string,
    contractAddress: string,
    startBlock: number,
    blocksPerBatch: number,
    port: number,
    logLevel: string,
    host: string,
  ) {
    this.mongoUri = mongoUri;
    this.providerUrl = providerUrl;
    this.contractAddress = contractAddress;
    this.startBlock = startBlock;
    this.blocksPerBatch = blocksPerBatch;
    this.port = port;
    this.logLevel = logLevel;
    this.host = host;
  }

  public static create(): Result<Config, string> {
    const mongoUri = process.env.MONGODB_URI || '';
    const providerUrl = process.env.RPC_PROVIDER_URL || '';
    const contractAddress = process.env.CONTRACT_ADDRESS || '';
    const startBlock = parseInt(process.env.START_BLOCK || '0', 10);
    const blocksPerBatch = parseInt(process.env.BLOCKS_PER_BATCH || '100', 10);
    const port = parseInt(process.env.PORT || '8080', 10);
    const logLevel = process.env.LOG_LEVEL || 'info';
    const host = process.env.HOST || '0.0.0.0';

    if (!mongoUri) {
      return err('MONGODB_URI is required');
    }
    if (!providerUrl) {
      return err('RPC_PROVIDER_URL is required');
    }
    if (!contractAddress) {
      return err('CONTRACT_ADDRESS is required');
    }
    if (startBlock === 0) {
      return err('START_BLOCK must be a non-negative number');
    }
    if (host === '') {
      return err('HOST is required');
    }

    return ok(
      new Config(
        mongoUri,
        providerUrl,
        contractAddress,
        startBlock,
        blocksPerBatch,
        port,
        logLevel,
        host,
      ),
    );
  }
}
