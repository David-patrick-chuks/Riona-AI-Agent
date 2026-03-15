# Operations Guide

## Rate Limits
- Avoid aggressive automation.
- Use `IG_DAILY_MAX_ACTIONS` to cap daily actions.

## Safety
- Skip sponsored content (enabled by default).
- Add locale-specific markers via `IG_AD_MARKERS`.

## Logs
- Use `LOGGER=console` for minimal logging.
- Default `winston` backend writes to `logs/`.
