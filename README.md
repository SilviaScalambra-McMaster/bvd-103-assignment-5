# McMasterful Books — Assignment 5: Adding OpenAPI

This project extends the Assignment 4 Koa book catalogue, warehouse inventory,
and orders system with generated OpenAPI 3 documentation, a `typescript-fetch`
partner SDK, SDK-driven API tests, and a generated-client website adapter.

## Prerequisites

- Node.js 22 or Node.js 20.19+, npm
- Java 21 (`java -version`) for the OpenAPI Generator CLI
- MongoDB available at `mongodb://mongo:27017` when running the website/backend
  in the course devcontainer (or set `MONGO_URI`)

The VS Code devcontainer config includes a Java feature; rebuild the container
after updating `.devcontainer/devcontainer.json`.

## First-time setup

```bash
npm install
npm run generate
npm run start-server
```

**Important:** The source ZIP originated in an npm-restricted environment.
The included `package-lock.json` comes from Assignment 4 and is **out of sync**
with Assignment 5's dependencies. The first `npm install` updates it. Commit
the resulting lockfile before submitting; CI uses `npm install` until this
has been done. After that, `npm ci` is the preferable reproducible CI install.

`npm run generate` runs `generate-openapi.sh`: tsoa generates `build/swagger.json`
and `build/routes.ts`; OpenAPI Generator produces `client/` from the spec.
Both directories are ignored by Git because they are generated outputs.
They are regenerated before `start-server`, `typecheck`, and `test:api`.

Run the supplied course website in another terminal:

```bash
mcmasterful-books
```

The website adapter selector is `adapter/index.ts`, pointing to the new
`adapter/assignment-5.ts`. All its HTTP calls use the generated SDK.

## API documentation

After starting the backend:

- [Swagger UI](http://localhost:3000/docs)
- [OpenAPI specification](http://localhost:3000/docs/spec)

The generated SDK exports `BooksApi`, `WarehouseApi`, `OrdersApi`, and `HelloApi`.
For example:

```ts
import { BooksApi, Configuration } from "./client";
const api = new BooksApi(
  new Configuration({ basePath: "http://localhost:3000" }),
);
const books = await api.listBooks();
const filtered = await api.searchBooks({
  searchBooksRequest: { filters: [{ author: "Writer" }, { from: 25 }] },
});
```

`POST /books/search` is a new partner-friendly operation. Its `filters` array
preserves Assignment 3 semantics: fields in one group use AND; groups use OR.
The original `GET /books?filters[0][name]=...` still works to preserve older
clients; simple `GET /books?author=...&from=...` is also documented.

## Available endpoints

| Method | Path                                  | Description                             |
| ------ | ------------------------------------- | --------------------------------------- |
| GET    | `/hello/{name}`                       | Simple SDK smoke test                   |
| GET    | `/books`                              | List all books, optional simple filters |
| POST   | `/books/search`                       | Search using grouped OR filters         |
| GET    | `/books/{id}`                         | Book details and shelf stock            |
| POST   | `/books`                              | Create a book                           |
| PUT    | `/books/{id}`                         | Replace book metadata                   |
| DELETE | `/books/{id}`                         | Delete book                             |
| POST   | `/warehouse/shelves`                  | Add physical inventory                  |
| GET    | `/warehouse/books/{bookId}/locations` | Locate shelf copies                     |
| POST   | `/orders`                             | Place an order                          |
| GET    | `/orders`                             | List pending orders                     |
| POST   | `/orders/{orderId}/fulfill`           | Fulfil an order                         |

Input validation uses tsoa-generated request checks and original domain
validation. Domain errors return `{ "error": "message" }` with HTTP 400,
404, or 409 as appropriate. Successful delete, shelf placement and fulfilment
return HTTP 204 without a response body.

## Verification

```bash
npm run generate           # Recreate spec, routes, and SDK
npm run typecheck          # Type-check source + generated artifacts
npm run lint               # ESLint; ignores generated code
npm run test:unit          # Existing unit + MongoDB memory integration tests
npm run test:api           # Real HTTP tests through generated SDK
npm run test:ci            # Both suites
npm run format:check
```

`test:unit` includes existing MongoDB integration tests. They use
`mongodb-memory-server` and may download a MongoDB binary on first run.
`test:api` uses an isolated, real HTTP Koa server with in-memory repository
implementations; the SDK makes actual HTTP calls to each test server.

GitHub Actions runs independent lint, typecheck, unit/integration, and
SDK API-test jobs. Java 21 is provisioned for generation jobs.

## Structure

```text
src/api/*.route.ts        tsoa controller classes (API's source of truth)
src/api/models.ts         documented partner request/response contracts
src/api/services.ts       Koa request-state service lookup
src/books/               catalogue domain + persistence
src/warehouse/           shelf inventory domain + persistence
src/orders/              order domain + persistence
src/app.ts                Koa server assembly and Swagger UI
adapter/assignment-5.ts  generated-client website adapter
tests/run_server.ts       independent API test server fixture
tests/partners-api.spec.ts SDK-based HTTP contract tests
tsoa.json                 generator configuration
openapitools.json         pinned Java generator version
generate-openapi.sh       full generation pipeline
.github/workflows/ci.yml separate static/unit/API jobs
build/                    generated (ignored)
client/                   generated (ignored)
```

## Configuration and previous limitations

- `MONGO_URI` defaults to `mongodb://mongo:27017`.
- `MONGO_DB_PREFIX` defaults to `mcmasterful`.
- `PORT` defaults to `3000`.

The Assignment 4 service layer retains its single-process order-fulfilment
serialization and compensating writes. Production multi-process deployments
need MongoDB replica-set transactions to achieve durable cross-document
atomicity. The assignment does not implement distributed transactions.

## Assignment 5 submission checklist

1. Run `npm install`, generation, tests, typecheck, lint, and formatting checks.
   Commit the refreshed `package-lock.json`.
2. Start backend and course website; verify all website features using the SDK.
3. Commit work incrementally and push to your **existing** GitHub repository.
4. Inspect the GitHub Actions run and resolve failures.
5. Capture a PNG/JPG of Swagger at `/docs` and the green Actions run.
6. Create a GitHub release tagged `assignment-5`.
7. Create a text file with the actual repository URL and release tag or URL;
   submit it with both screenshots in the single Avenue to Learn submission.

Never submit placeholder URLs or mock screenshots as real evidence.
