# CI Pipeline

The CI workflow runs on every push and pull request.

Steps:

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm format:check`
- `pnpm test`
