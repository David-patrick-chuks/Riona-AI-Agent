# Testing

## Run tests

```sh
pnpm test              # all API unit + integration tests
pnpm test:coverage     # with coverage report
pnpm --filter @riona/api test path/to/file.test.ts
```

## Layout

Tests live next to source as `*.test.ts` under `apps/api/src/`:

| Area     | Examples                                                              |
| -------- | --------------------------------------------------------------------- |
| Config   | `config/igProfile.test.ts`, `config/igRisk.test.ts`                   |
| Services | `services/igChallenge.test.ts`, `services/actionLog.test.ts`          |
| Clients  | `client/X-bot/client/tweet.test.ts`, `client/IG-bot/IgClient.test.ts` |
| Routes   | `routes/api.test.ts` (supertest HTTP integration)                     |
| Utils    | `utils/index.test.ts`, `utils/tweetLimit.test.ts`                     |

## CI

`pnpm check` runs lint, typecheck, format check, and the full test suite on every push/PR.
