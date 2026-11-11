# Assignment 4 implementation handoff

## Implemented

- Preserved the Assignment 3 CRUD and book filtering endpoints through a catalogue repository.
- Implemented `GET /books/:id` and added stock to individual/list responses.
- Implemented shelf stock addition, location lookup, pending order creation/listing and
  exact-quantity fulfilment.
- Separated catalogue, warehouse and orders into three MongoDB databases.
- Created ports/adapters: in-memory and MongoDB warehouse/order repositories.
- Completed all seven previously unfinished Assignment 4 website adapter methods and
  switched the frontend adapter entrypoint to Assignment 4.
- Added Vitest domain tests, MongoDB-memory-server HTTP integration tests and a CI test job.
- Added input validation and failure/stock-isolation safeguards.

## Local validation actually performed

- Compared all uploaded project archives; used the newer Assignment 3 repository.
- Parsed/transpiled 26 TypeScript files using globally available TypeScript: no syntax errors.
- Attempted `npm install` and `npm ci --offline`, but registry DNS access was unavailable.
- Ran 12 direct **in-memory runtime checks** against transpiled TypeScript domain
  modules: passed, covering inventory, ordering, fulfilment and error handling.
- The full Vitest suite, MongoDB Memory Server integration, TypeScript semantic
  type checking, lint, formatting and the website **were not verified here**
  because the npm dependencies were unavailable. Do not claim they passed.

## Required steps before submission

1. Open the project on a machine or Codespace with npm registry connectivity.
2. Run `npm install`; this will reconcile the included older npm lockfile with the new
   Vitest and MongoDB Memory Server packages. Commit the updated `package-lock.json`.
3. Run `npm run fmt`, `npm run lint`, `npm run typecheck`, `npm run test:ci`.
   Fix any surfaced errors.
4. Open the VS Code devcontainer, run `mcmasterful-books` and
   `npm run start-server` in separate terminals.
5. Confirm that the UI can add stock, place and fulfil orders, and display stock levels.
6. Push to the original GitHub repository and verify the real green GitHub Actions results.
7. Create a GitHub release tagged `assignment-4` and submit its URL and CI evidence.

## Important engineering boundary

The assignment-ready implementation handles fulfilments sequentially within a Node.js
process and uses conditional MongoDB decrements with compensating rollback. It does NOT
provide durable cross-database atomicity during process crashes or across multiple
backend instances. Production deployment should use MongoDB replica-set transactions
and preferably an explicit order fulfilment idempotency protocol.

## Notes about Git history

A GitHub downloaded ZIP contains no `.git` metadata. Therefore this artifact cannot
preserve your existing commit history or create a release on your account. Apply the
files to the original working repository and commit your progress there.
