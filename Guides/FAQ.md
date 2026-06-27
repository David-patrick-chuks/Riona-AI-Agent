# FAQ

## The bot is not commenting or liking

This usually happens when the Instagram automation loop is not enabled.

**Fix:** enable the loop in your root `.env`:

```env
IG_AGENT_ENABLED=true
```

Then restart: `pnpm dev`

**Alternative:** manually trigger via `POST /api/login` then `POST /api/interact`.

## Cookie errors

If Instagram login fails or the session breaks:

**Fix:**

1. Delete `apps/api/cookies/Instagramcookies.json`
2. Restart: `pnpm dev`
3. Re-login via `/api/login` or the dashboard

## Sponsored posts

Improve detection with:

- `IG_AD_MARKERS`
- `IG_AD_BUTTON_MARKERS`

Use comma-separated values in `.env`.

## Which package manager should I use?

This repo is a **pnpm workspace**. Use:

```sh
pnpm install
pnpm dev
pnpm check
```

Do not use `npm install` — there is no `package-lock.json`.

## Should I run `pnpm audit --fix`?

Avoid `--force` unless necessary; it can break dependencies.

**Recommended:**

```sh
pnpm audit
pnpm audit --fix
```

For remaining issues, update specific packages in `apps/api/package.json` or `apps/recaptcha/package.json`, then run `pnpm check`.

## Where is the source code?

| What           | Where                 |
| -------------- | --------------------- |
| API & IG/X bot | `apps/api/src/`       |
| reCAPTCHA ML   | `apps/recaptcha/src/` |
| Docs           | `Guides/`             |
| Env file       | `.env` (repo root)    |

See [Monorepo.md](./Monorepo.md) for the full tree.
