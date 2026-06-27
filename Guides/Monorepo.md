# Monorepo Guide

Riona is a **plain pnpm workspace** monorepo — no Turbo, Nx, Lerna, or Rush.

## Layout

```
Riona-AI-Agent/
├── .env                    # Local secrets (repo root — shared by all apps)
├── .env.example
├── pnpm-workspace.yaml
├── package.json            # Root orchestration scripts only
├── pnpm-lock.yaml
├── docker-compose.yml      # Postgres for local dev
├── Guides/                 # Documentation
├── apps/
│   ├── api/                # @riona/api — main server & automation
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── scripts/        # check-env, setup, db migrate
│   │   ├── src/
│   │   │   ├── Agent/      # AI agent, training, characters
│   │   │   ├── client/     # Instagram, X/Twitter clients
│   │   │   ├── config/     # accounts, igProfile, logger, db
│   │   │   ├── routes/     # Express API routes
│   │   │   ├── services/   # action logs, webhooks, metrics
│   │   │   ├── views/      # dashboard HTML
│   │   │   └── index.ts    # Entry point
│   │   ├── cookies/        # Runtime IG session cookies
│   │   └── logs/           # Runtime application logs
│   └── recaptcha/          # @riona/recaptcha — ML reCAPTCHA solver
│       ├── package.json
│       ├── src/
│       ├── model/
│       └── public/
└── packages/
    └── tsconfig/           # @riona/tsconfig — shared TS base config
```

## Packages

| Package            | Path                | Purpose                                                |
| ------------------ | ------------------- | ------------------------------------------------------ |
| `riona`            | `.`                 | Workspace root — `pnpm dev`, `pnpm check`, `pnpm db:*` |
| `@riona/api`       | `apps/api`          | Instagram/X automation, REST API, admin dashboard      |
| `@riona/recaptcha` | `apps/recaptcha`    | TensorFlow reCAPTCHA classifier & solver service       |
| `@riona/tsconfig`  | `packages/tsconfig` | Shared `tsconfig` base extended by apps                |

## Commands

### From the repo root

```sh
pnpm install          # install all workspace dependencies
pnpm dev              # start @riona/api in dev mode
pnpm dev:all          # start all apps with a `dev` script
pnpm start            # build + run API
pnpm check            # lint + typecheck + test + format
pnpm test             # API test suite (151+ tests)
pnpm test:coverage    # tests with coverage report
pnpm db:up            # start Postgres (Docker)
pnpm db:migrate       # apply schema
```

### Filter by package

```sh
pnpm --filter @riona/api dev
pnpm --filter @riona/api test
pnpm --filter @riona/recaptcha dev
pnpm --filter @riona/recaptcha train
```

Shorthand root aliases exist for common tasks: `pnpm recaptcha:dev`, `pnpm train:youtube`, etc. See [Scripts.md](./Scripts.md).

## Environment & runtime paths

- **`.env`** lives at the **repo root**. `apps/api` loads it automatically on startup.
- **Accounts file:** `apps/api/src/config/accounts.json` (copy from `accounts.example.json`)
- **Logs:** `apps/api/logs/` (Winston) or stdout when `LOGGER=console`
- **IG cookies:** `apps/api/cookies/Instagramcookies.json`
- **Action log fallback:** `apps/api/logs/actionLogs.json` when `DATABASE_URL` is unset

When you run `pnpm dev` or `pnpm --filter @riona/api dev`, the working directory is `apps/api`, so relative runtime paths resolve there.

## CI

GitHub Actions runs on every push/PR:

```sh
pnpm install --frozen-lockfile
pnpm lint && pnpm typecheck && pnpm format:check && pnpm test
```

See [CI.md](./CI.md).

## Adding a new package

1. Create `apps/<name>/package.json` with `"name": "@riona/<name>"`.
2. Ensure `pnpm-workspace.yaml` includes `apps/*`.
3. Add root scripts that delegate with `pnpm --filter @riona/<name> <script>`.
