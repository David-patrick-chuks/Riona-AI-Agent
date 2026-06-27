# Scripts

Root orchestration (pnpm workspace):

- `pnpm dev` / `pnpm dev:api` — run `@riona/api` in dev mode
- `pnpm dev:recaptcha` — run `@riona/recaptcha` dev server
- `pnpm dev:all` — run all workspace `dev` scripts in parallel
- `pnpm start` — build + run API server
- `pnpm test` — API unit tests
- `pnpm lint` — lint API sources
- `pnpm typecheck` — TypeScript check (all packages)
- `pnpm check` — lint + typecheck + test + format check
- `pnpm format` — format code
- `pnpm check:env` — validate required env vars
- `pnpm db:up` / `pnpm db:down` / `pnpm db:migrate` — Postgres helpers

Per-package filters:

- `pnpm --filter @riona/api <script>`
- `pnpm --filter @riona/recaptcha <script>`
