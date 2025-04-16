# Fee Collector Service

This service tracks and stores fee collection events from the blockchain. It monitors Ethereum transactions related to LiFi fee collection, indexes them, and stores the data in MongoDB for easy querying and reporting.

## Areas of improvemnt and considerations

- There can be a RPC provider management layer which is responsible which
- CI/CD pipeline with tests and checks
- I used http fetching from RPC node since events are not very frequent and we don't need real time updates
- The service doesn't scan the same blocks twice while running
- The service fetches events in batches, processing each batch and stores them

I used Result approach to error handking as this allows for better error handling and more readable code,
also, the service follows layered architecture where we have :
repository -> service -> transport layer

## Prerequisites

- Node.js (v22)
- MongoDB
- Ethereum provider URL (Infura, Alchemy, etc.)
- pnpm package manager

## Installation

```bash
# Clone the repository
git clone https://github.com/vpatsenko/lifi-events-indexer.git
cd lifi-events-indexer

# Install dependencies
pnpm install

# Copy the example environment file and configure it
cp .env.example .env
# Edit .env file with your configuration
```

## Running Locally

1. Start MongoDB using the provided Makefile:

```bash
# Start MongoDB in a Docker container
make mongodb-start
```

2. Run database migrations:

```bash
pnpm migrate:up
```

3. Start the service:

```bash
pnpm start
```

The service will be available at http://localhost:3000 (or the port specified in your .env file).

## Running with Docker Compose

The service can also be run using Docker Compose, which will set up all the necessary services:

1. Configure your environment variables:

```bash
cp .env.example .env
# Edit .env file with your configuration
```

2. Build and start the containers:

```bash
docker-compose up -d
```

This will start three containers:

- lifi-events-indexer: The main application
- lifi-migrations: Runs the database migrations
- lifi-mongodb: MongoDB database

To view logs:

```bash
docker-compose logs -f
```

To stop the services:

```bash
docker-compose down
```

## Running Tests

The project includes a test suite built with Jest:

```bash
pnpm test
```

## Available Commands

### Makefile Commands

```bash
make mongodb-start     # Start MongoDB container
make mongodb-stop      # Stop MongoDB container
make mongodb-restart   # Restart MongoDB container
make mongodb-shell     # Access MongoDB shell
make migrate-up        # Run database migrations
make migrate-down      # Rollback database migrations
make migrate-create    # Create a new migration file
```

### NPM Scripts

```bash
pnpm build             # Build the TypeScript project
pnpm start             # Start the application
pnpm lint              # Run linting
pnpm format            # Format code
pnpm test              # Run tests
pnpm migrate:up        # Run migrations
pnpm migrate:down      # Revert migrations
pnpm migrate:create    # Create a new migration
```
