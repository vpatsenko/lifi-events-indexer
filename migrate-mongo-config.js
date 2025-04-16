const { config: dotenvConfig } = require('dotenv');
dotenvConfig();

const config = {
  mongodb: {
    url: process.env.MONGODB_URI.includes('@')
      ? process.env.MONGODB_URI
      : process.env.MONGODB_URI.replace('mongodb://', `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@`),
    databaseName: process.env.MONGODB_DB_NAME,

    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      authSource: 'admin'
    }
  },

  migrationsDir: "migrations",

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  changelogCollectionName: "changelog",

  // The mongodb collection where the lock will be created.
  lockCollectionName: "changelog_lock",

  // The value in seconds for the TTL index that will be used for the lock. Value of 0 will disable the feature.
  lockTtl: 0,

  // The file extension to create migrations and search for in migration dir
  migrationFileExtension: ".ts",

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determine
  // if the file should be run.  Requires that scripts are coded to be run multiple times.
  useFileHash: false,

  // Don't change this, unless you know what you're doing
  moduleSystem: 'commonjs',
};

module.exports = config;
