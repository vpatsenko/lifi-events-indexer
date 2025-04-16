import { prop, getModelForClass, modelOptions, Severity } from '@typegoose/typegoose';
import mongoose from 'mongoose';
import loadType from 'mongoose-long';

loadType(mongoose);

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: 'feesCollected',
  },
  options: {
    allowMixed: Severity.ALLOW,
  },
})
export class FeesCollectedEvent {
  @prop({ required: true, index: true })
  public tokenAddress!: string;

  @prop({ required: true, index: true })
  public integratorAddress!: string;

  @prop({ required: true, type: String })
  public integratorFee!: string;

  @prop({ required: true, type: String })
  public lifiFee!: string;

  @prop({ required: true })
  public blockNumber!: number;

  @prop({ required: true })
  public transactionHash!: string;

  @prop({ required: true, default: Date.now })
  public createdAt?: Date;
}

export const FeesCollectedModel = getModelForClass(FeesCollectedEvent);
