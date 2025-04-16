import mongoose from 'mongoose';
import { Result, err, ok } from 'neverthrow';

import { FeesCollectedModel, FeesCollectedEvent } from '../models/FeesCollected';

export type RepositoryError = {
  message: string;
  code: 'CONNECTION_ERROR' | 'OPERATION_ERROR';
};

export class FeesCollectedRepository {
  private mongodbUri: string;

  constructor(mongodbUri: string) {
    this.mongodbUri = mongodbUri;
  }

  public async connect(): Promise<Result<void, RepositoryError>> {
    try {
      await mongoose.connect(this.mongodbUri);
      return ok(undefined);
    } catch (error) {
      return err({
        message: `Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        code: 'CONNECTION_ERROR',
      });
    }
  }

  public async createMany(
    events: Partial<FeesCollectedEvent>[],
  ): Promise<Result<FeesCollectedEvent[], RepositoryError>> {
    try {
      const createdEvents = await FeesCollectedModel.insertMany(events, { ordered: false });
      return ok(createdEvents);
    } catch (error) {
      return err({
        message: `Failed to create events: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        code: 'OPERATION_ERROR',
      });
    }
  }

  public async findAll(
    limit: number,
    skip: number,
  ): Promise<Result<FeesCollectedEvent[], RepositoryError>> {
    try {
      const events = await FeesCollectedModel.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .exec();
      return ok(events);
    } catch (error) {
      return err({
        message: `Failed to find event by id: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        code: 'OPERATION_ERROR',
      });
    }
  }

  public async findById(id: string): Promise<Result<FeesCollectedEvent | null, RepositoryError>> {
    try {
      const event = await FeesCollectedModel.findById(id).exec();
      return ok(event);
    } catch (error) {
      return err({
        message: `Failed to find event by id: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        code: 'OPERATION_ERROR',
      });
    }
  }

  public async findByToken(
    tokenAddress: string,
    limit = 10,
    skip = 0,
  ): Promise<Result<FeesCollectedEvent[], RepositoryError>> {
    try {
      const events = await FeesCollectedModel.find({ tokenAddress })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .exec();
      return ok(events);
    } catch (error) {
      return err({
        message: `Failed to find events by token: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        code: 'OPERATION_ERROR',
      });
    }
  }

  public async findByIntegrator(
    integratorAddress: string,
    limit = 10,
    skip = 0,
  ): Promise<Result<FeesCollectedEvent[], RepositoryError>> {
    try {
      const events = await FeesCollectedModel.find({ integratorAddress })
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .exec();
      return ok(events);
    } catch (error) {
      return err({
        message: `Failed to find events by integrator: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        code: 'OPERATION_ERROR',
      });
    }
  }

  public async getLatestEventBlock(): Promise<Result<number, RepositoryError>> {
    try {
      const event = await FeesCollectedModel.findOne()
        .sort({ blockNumber: -1 })
        .select('blockNumber')
        .exec();

      if (!event) {
        return ok(0);
      }

      return ok(event.blockNumber);
    } catch (error) {
      return err({
        message: `Failed to get latest event block: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        code: 'OPERATION_ERROR',
      });
    }
  }

  public async disconnect(): Promise<Result<null, RepositoryError>> {
    try {
      await mongoose.disconnect();
      return ok(null);
    } catch (error) {
      return err({
        message: `Failed to disconnect from MongoDB: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        code: 'CONNECTION_ERROR',
      });
    }
  }
}
