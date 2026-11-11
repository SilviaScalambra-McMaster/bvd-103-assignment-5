# Assignment 5 implementation handoff

## Implemented in this archive

- Migration to tsoa controller discovery and generated Koa routes.
- OpenAPI 3 specification, schema validation, descriptive endpoint docs and examples.
- Swagger UI hosted at `/docs` and spec exposed at `/docs/spec`.
- Java-powered `typescript-fetch` SDK generation in `generate-openapi.sh`.
- New `adapter/assignment-5.ts` using generated `BooksApi`, `OrdersApi`,
  and `WarehouseApi` for all nine website adapter operations.
- Preserve existing HTTP routes and legacy filter semantics; add POST `/books/search`
  to express OR filters through the SDK.
- Dedicated isolated SDK-over-HTTP tests in `tests/` and separate CI jobs.
- Per-request Koa service state and 400/404/409 error mapping.

## Verification in this environment

- The input Assignment 4 archive was inspected.
- npm registry is not reachable (`EAI_AGAIN`); dependencies cannot be fetched.
- Therefore **the SDK, Swagger spec, generated routes, Vitest suite, TypeScript
  typecheck, ESLint, website and GitHub Actions have not been executed here**.
- No real screenshots, GitHub release, or submission URL were produced.

## Mandatory completion on an npm-connected machine

```bash
npm install
npm run generate
npm run typecheck
npm run lint
npm run test:unit
npm run test:api
npm run format:check
npm run start-server
```

Inspect browser `/docs`, and launch `mcmasterful-books` in a separate terminal.
Correct any generator/SDK signature/version problems revealed by actual builds,
commit the refreshed package-lock.json, push, verify green CI, and prepare actual
screenshots and GitHub release.

**Source provenance**: based on the user-provided Assignment 4 project ZIP.
Existing domain functionality and in-memory/MongoDB data adapters are retained.
