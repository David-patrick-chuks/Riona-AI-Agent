# CI Pipeline

The CI workflow (`.github/workflows/ci.yml`) runs on every push and pull request.

## Steps

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test
```

Locally, `pnpm check` runs the same validation (except frozen lockfile).

## Matrix

- Node.js 20 and 22 on `ubuntu-latest`
- pnpm version from `packageManager` in root `package.json`

See [Monorepo.md](./Monorepo.md) for workspace details.
