# Docker fix for Assignment 7

The three API Dockerfiles now copy the root `tsconfig.json` into `/app`.
This is required because the API route controllers use TSOA decorators and
`tsx` otherwise falls back to a TypeScript configuration without
`experimentalDecorators` enabled inside the container.

After extracting this project, run:

    docker compose down
    docker compose build --no-cache
    docker compose up

Then open:

    http://localhost:8080/docs
