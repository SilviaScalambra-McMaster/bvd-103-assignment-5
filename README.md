# McMasterful Books — BDV 103 Assignment 7

This version separates the original application into three bounded services and adds RabbitMQ event messaging.

## Services

- `services/catalogue` — owns catalogue books and cached total stock.
- `services/warehouse` — owns shelf inventory and a local cache of book metadata.
- `services/orders` — owns orders and a local cache of valid book IDs.
- `services/swagger` — hosts the combined OpenAPI documentation.
- `packages/messaging` — small shared event-bus client and event contracts.

No service reads another service's MongoDB database. Runtime changes are propagated through RabbitMQ events.

## Run locally with Docker

Prerequisites: Docker Desktop.

```bash
npm install
npm run generate
docker compose up --build
```

The external API is available through Nginx at:

- `http://localhost:8080/books`
- `http://localhost:8080/warehouse/shelves`
- `http://localhost:8080/orders`
- `http://localhost:8080/docs`

RabbitMQ management UI is available at `http://localhost:15672`.

## Event flow

Catalogue publishes:

- `BookAdded`
- `BookUpdated`
- `BookDeleted`

Warehouse publishes:

- `BookStockChanged`

Orders publishes:

- `OrderPlaced`
- `OrderFulfillmentRequested`

Warehouse consumes book events to maintain its local book cache and consumes fulfillment requests. It publishes either `OrderFulfillmentCompleted` or `OrderFulfillmentFailed`.

Orders consumes book events to maintain its valid-book cache and consumes fulfillment results.

Catalogue consumes `BookStockChanged` and updates its local `stockTotal`.

For initial synchronization, warehouse and orders may read the catalogue API once when starting. After startup, changes are synchronized by events rather than service-to-service calls.

## OpenAPI generation

Each API has its own `tsoa.json` and generates its own `build/swagger.json` and `build/routes.ts`.

The root `npm run generate` command generates all three API specs and combines their paths and schemas into:

`services/swagger/build/swagger.json`

The Swagger service serves that combined document.

## Verification

```bash
npm install
npm run generate
npm run typecheck
npm run lint
npm run format:check
```

Then:

```bash
docker compose up --build
```

Test the external API through Nginx, not the individual containers.

## GitHub submission

The assignment requires a GitHub release tagged `assignment-7`. Then create one `.txt` file containing the repository URL and the release tag or release URL.

Example:

```text
Repository: https://github.com/YOUR-USERNAME/YOUR-REPOSITORY
Release tag: assignment-7
Release URL: https://github.com/YOUR-USERNAME/YOUR-REPOSITORY/releases/tag/assignment-7
```

Submit that single `.txt` file to Avenue to Learn. Keep a copy of the project and the submission receipt.
