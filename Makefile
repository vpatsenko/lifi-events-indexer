# MongoDB Configuration
MONGODB_PORT=27017
MONGODB_USER=admin
MONGODB_PASSWORD=admin
MONGODB_DB_NAME=lifi
MONGODB_CONTAINER_NAME=lifi-mongodb

.PHONY: mongodb-start mongodb-stop mongodb-restart mongodb-shell mongodb-migrate-up mongodb-migrate-down mongodb-migrate-create

mongodb-start:
	docker run --name $(MONGODB_CONTAINER_NAME) \
		-p $(MONGODB_PORT):27017 \
		-e MONGO_INITDB_ROOT_USERNAME=$(MONGODB_USER) \
		-e MONGO_INITDB_ROOT_PASSWORD=$(MONGODB_PASSWORD) \
		-e MONGO_INITDB_DATABASE=$(MONGODB_DB_NAME) \
		-d mongo:latest

mongodb-stop:
	docker stop $(MONGODB_CONTAINER_NAME)
	docker rm $(MONGODB_CONTAINER_NAME)

mongodb-restart: mongodb-stop mongodb-start

mongodb-shell:
	docker exec -it $(MONGODB_CONTAINER_NAME) mongosh \
		--username $(MONGODB_USER) \
		--password $(MONGODB_PASSWORD) \
		$(MONGODB_DB_NAME)

migrate-up:
	npm run migrate:up

migrate-down:
	npm run migrate:down

migrate-create:
	npm run migrate:create

help:
	@echo "Available commands:"
	@echo "  mongodb-start    - Start MongoDB container"
	@echo "  mongodb-stop     - Stop MongoDB container"
	@echo "  mongodb-restart  - Restart MongoDB container"
	@echo "  mongodb-shell    - Access MongoDB shell"
	@echo "  migrate-up       - Run database migrations"
	@echo "  migrate-down     - Rollback database migrations"
	@echo "  migrate-create   - Create a new migration file"
