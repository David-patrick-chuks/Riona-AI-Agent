# Contributing

Thanks for your interest in improving Riona AI Agent.

## Getting started

1. Fork the repo and create a feature branch.
2. Install [pnpm](https://pnpm.io/installation).
3. From the repo root:

```sh
pnpm install
pnpm check        # lint + typecheck + test + format
```

4. Run the API locally: `pnpm dev`

See [Guides/Monorepo.md](Guides/Monorepo.md) for workspace layout.

## Where to change things

| Change           | Location                    |
| ---------------- | --------------------------- |
| API routes       | `apps/api/src/routes/`      |
| IG / X clients   | `apps/api/src/client/`      |
| Agent & training | `apps/api/src/Agent/`       |
| Tests            | `apps/api/src/**/*.test.ts` |
| reCAPTCHA app    | `apps/recaptcha/`           |
| Docs             | `Guides/`                   |

## Commit style

Use clear, natural commit messages:

- `fix: handle invalid cookie JSON`
- `docs: add usage examples`
- `test: add IG client unit tests`

## Pull requests

- Keep changes focused.
- Include tests where appropriate (`pnpm test`).
- Run `pnpm check` before opening a PR.
- Update docs in `Guides/` or `README.md` if behavior or paths change.

## Reporting issues

Include:

- OS and Node.js version
- Steps to reproduce (`pnpm dev`, endpoint called, etc.)
- Expected vs actual behavior
- Relevant logs from `apps/api/logs/` (sanitize secrets)
