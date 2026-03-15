# Environment Variables

## Required
- `IGusername`
- `IGpassword`
- `MONGODB_URI`

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

## Sponsored content filters
- `IG_AD_MARKERS`
- `IG_AD_BUTTON_MARKERS`

## Logging
- `LOGGER` ("winston" | "console")

## Training
- `TRAIN_MAX_FILE_MB`
- `TRAIN_DRY_RUN` (true/false)
