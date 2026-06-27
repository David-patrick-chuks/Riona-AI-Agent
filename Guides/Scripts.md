# Scripts

All commands run from the **repo root** unless noted.

## Root orchestration (pnpm workspace)

| Script                                              | Description                                 |
| --------------------------------------------------- | ------------------------------------------- |
| `pnpm dev` / `pnpm dev:api`                         | Run `@riona/api` in dev mode                |
| `pnpm dev:recaptcha`                                | Run `@riona/recaptcha` dev server           |
| `pnpm dev:all`                                      | Run all workspace `dev` scripts in parallel |
| `pnpm start`                                        | Build + run API server                      |
| `pnpm build`                                        | Build all packages                          |
| `pnpm test`                                         | API unit + integration tests                |
| `pnpm test:coverage`                                | Tests with coverage report                  |
| `pnpm lint`                                         | Lint API sources                            |
| `pnpm typecheck`                                    | TypeScript check (all packages)             |
| `pnpm check`                                        | lint + typecheck + test + format check      |
| `pnpm format`                                       | Prettier write                              |
| `pnpm check:env`                                    | Validate required env vars                  |
| `pnpm setup`                                        | Setup health check                          |
| `pnpm db:up` / `pnpm db:down` / `pnpm db:migrate`   | Postgres helpers                            |
| `pnpm train:link` / `train:audio` / `train:youtube` | Agent training                              |
| `pnpm recaptcha:*`                                  | reCAPTCHA app scripts                       |

## Per-package filters

```sh
pnpm --filter @riona/api <script>
pnpm --filter @riona/recaptcha <script>
```

## API-only scripts (`apps/api/package.json`)

These run automatically when filtered or via root aliases:

- `dev`, `start`, `build`, `test`, `lint`, `typecheck`
- `check:env`, `setup`, `db:migrate`
- `train:link`, `train:audio`, `train:youtube`

See [Monorepo.md](./Monorepo.md) for the full directory layout.
