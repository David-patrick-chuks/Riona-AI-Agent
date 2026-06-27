# Operations Guide

Operations commands run from the **repo root** with pnpm. The API app (`apps/api`) is the main runtime.

## Start & stop

```sh
pnpm db:up          # Postgres (Docker)
pnpm dev            # API dev server
pnpm start          # production build + run
pnpm db:down        # stop Postgres
```

## Rate limits

- Avoid aggressive automation; use `IG_RUN_PROFILE=safe` for new accounts
- Cap daily actions with `IG_DAILY_MAX_ACTIONS`
- API rate limits are documented at `GET /api/docs`

## Safety

- Skip sponsored content (enabled by default)
- Add locale-specific markers via `IG_AD_MARKERS`
- IG challenges trigger automatic cooldown — see dashboard **Runtime Config**

## Logs & monitoring

- Dashboard: `http://localhost:3000/dashboard`
- Health: `GET /api/health`
- Metrics (auth): `GET /api/metrics` or `/metrics` page
- Log files: `apps/api/logs/` (Winston) or stdout when `LOGGER=console`

## Database

```sh
pnpm db:migrate     # apply schema manually
```

Action logs use PostgreSQL when `DATABASE_URL` is set; otherwise `apps/api/logs/actionLogs.json`.
