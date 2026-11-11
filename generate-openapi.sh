#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
# The spec and Koa handlers are generated from precisely the same controllers.
npm run generate:routes
# Java 11+ is needed to execute the OpenAPI Generator CLI.
npm run generate:sdk
