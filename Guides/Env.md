# Environment Variables

## Required

- `IGusername`
- `IGpassword`

## Database (optional)

- `DATABASE_URL` — PostgreSQL connection URL (see `.env.example`)
- `DB_REQUIRED` — set to `true` to fail startup without a database

If `DATABASE_URL` is unset, action logs use `logs/actionLogs.json`.

## Gemini

- `GEMINI_API_KEY` (primary)
- `GEMINI_API_KEY_1..N` (rotation)

## Instagram automation

- `IG_AGENT_ENABLED` (true/false)
- `IG_AGENT_INTERVAL_MS`
- `IG_DAILY_MAX_ACTIONS`
- `IG_RUN_PROFILE` (safe | standard | aggressive)
- `IG_MAX_POSTS_PER_RUN`
- `IG_ACTION_DELAY_MIN_MS`
- `IG_ACTION_DELAY_MAX_MS`
- `IG_COOLDOWN_MINUTES` (cooldown duration after errors)

## Multi-account

- `src/config/accounts.json` (see `src/config/accounts.example.json`)

## Sponsored content filters

- `IG_AD_MARKERS`
- `IG_AD_BUTTON_MARKERS`

## Logging

- `LOGGER` ("winston" | "console")

## Training

- `TRAIN_MAX_FILE_MB`
- `TRAIN_DRY_RUN` (true/false)

## Comment filters

- `IG_COMMENT_ALLOWLIST` (comma-separated)
- `IG_COMMENT_DENYLIST` (comma-separated)
- `IG_COMMENT_SENTIMENT` (any | positive | neutral)
- `IG_COMMENT_MIN_LENGTH` (minimum comment length in characters)
- `IG_COMMENT_MAX_LENGTH` (maximum comment length in characters)
