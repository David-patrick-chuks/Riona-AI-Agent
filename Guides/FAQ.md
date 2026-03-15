# FAQ

## The server starts but nothing happens
Enable the IG loop with `IG_AGENT_ENABLED=true` or call `/api/interact`.

## Cookie errors
Delete `cookies/Instagramcookies.json` or let the app auto-backup and re-login.

## Sponsored posts
Use `IG_AD_MARKERS` and `IG_AD_BUTTON_MARKERS` to tune detection.

## Should I run `npm audit fix --force`?
Avoid `--force` by default. It can upgrade major versions and break the app.
Recommended path:
- Run `npm audit` to see details
- Run `npm audit fix` first
- For remaining issues, update specific packages intentionally and test
