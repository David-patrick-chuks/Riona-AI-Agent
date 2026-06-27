# Logging

Logging is configured in `apps/api/src/config/logger.ts`. Runtime log files are written under **`apps/api/logs/`** when the API runs via pnpm (working directory is `apps/api`).

## Console logger

Set `LOGGER=console` in the root `.env` to avoid Winston file output and log only to stdout/stderr.

## Winston logger

Default behavior writes rotating files to `apps/api/logs/` and prints to the console.

## Admin log endpoints

When authenticated:

- `GET /api/admin/logs` — recent application log lines
- `GET /api/admin/errors` — failed actions and server errors

The dashboard at `/dashboard` surfaces logs and errors in the UI.
