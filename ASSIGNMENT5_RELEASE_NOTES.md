# Assignment 5 — Adding OpenAPI

## Highlights

- OpenAPI 3 generated from typed tsoa controllers (`Books`, `Warehouse`, `Orders`, `Hello`)
- Swagger UI and specification served at `/docs` and `/docs/spec`
- Java-powered `typescript-fetch` SDK generation on demand
- Assignment 5 website adapter migrated to the generated TypeScript SDK
- Original catalogue, shelf inventory and order domain services preserved
- Existing book filter syntax retained, and SDK-compatible `/books/search` introduced
- API contract tests use generated clients against isolated Koa HTTP servers
- GitHub Actions splits lint, typecheck, legacy tests and generated-SDK API tests
- Schema and domain error handling centralized

## Limitations prior to submission

The npm registry was unavailable in the build environment. This is a source
implementation, not a recorded successful CI run. On an internet-connected
machine run `npm install`, `npm run generate`, `npm run typecheck`,
`npm run test:ci`, `npm run lint` and `npm run format:check`. Review the
actual generated SDK and fix any remaining issues before tagging the release.

The GitHub release and real Swagger/CI screenshots must be created using
your own existing repository and live running application.
