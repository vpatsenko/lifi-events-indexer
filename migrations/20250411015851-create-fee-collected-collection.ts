import { Db } from 'mongodb';

export async function up(db: Db): Promise<void> {
  const collections = await db.listCollections({ name: 'feesCollected' }).toArray();
  if (collections.length > 0) {
    return;
  }

  await db.createCollection('feesCollected', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: [
          'tokenAddress',
          'integratorAddress',
          'integratorFee',
          'lifiFee',
          'blockNumber',
          'transactionHash',
          'createdAt',
        ],
        properties: {
          tokenAddress: {
            bsonType: 'string',
            description: 'The token address',
          },
          integratorAddress: {
            bsonType: 'string',
            description: 'The integrator address',
          },
          integratorFee: {
            bsonType: 'string',
            description: 'uint256 stored as string',
          },
          lifiFee: {
            bsonType: 'string',
            description: 'uint256 stored as string',
          },
          blockNumber: {
            bsonType: 'int',
            description: 'Block number',
          },
          transactionHash: {
            bsonType: 'string',
            description: 'Transaction hash',
          },
          createdAt: {
            bsonType: 'date',
            description: 'Processing timestamp',
          },
        },
      },
    },
  });

  const collection = db.collection('feesCollected');
  await collection.createIndex({ tokenAddress: 1 });
  await collection.createIndex({ integratorAddress: 1 });
}

export async function down(db: Db): Promise<void> {
  await db.collection('feesCollected').drop();
}
