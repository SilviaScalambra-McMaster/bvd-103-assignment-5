# Assignment 7 handoff

## Local verification

1. Open this folder in VS Code.
2. Run:
   ```bash
   npm install
   npm run generate:spec
   npm run typecheck
   ```
3. Start the full stack:
   ```bash
   docker compose up --build
   ```
4. Open:
   - http://localhost:8080/docs
   - http://localhost:8080/books
   - http://localhost:8080/orders
5. Test book creation, shelf placement, order creation and fulfilment through the external Nginx URL.

## Git workflow

Commit checkpoints should be made separately, for example:

```text
assignment-7: split catalogue warehouse and orders services
assignment-7: add RabbitMQ event bus and service consumers
assignment-7: add local caches and separate Mongo databases
assignment-7: update Nginx and combined Swagger
assignment-7: verify tests and documentation
```

Push the commits to the existing GitHub repository.

## Release

Create a GitHub release with tag:

`assignment-7`

If a correction is needed after the release, create a new revision tag such as:

`assignment-7.1`

## Avenue submission

Create a single text file containing:

```text
Repository: https://github.com/SilviaScalambra-McMaster/bvd-103-assignment-5
Release tag: assignment-7
Release URL: https://github.com/SilviaScalambra-McMaster/bvd-103-assignment-5/releases/tag/assignment-7
```

Upload that one `.txt` file to the Assignment 7 folder in Avenue.
