# Instagram Bot Guide

This guide covers configuring and running the Instagram bot in **`apps/api`** (`@riona/api`).

## 1. Prerequisites & file structure

```
Riona-AI-Agent/
├── .env                          # IGusername, IGpassword, DATABASE_URL, etc.
├── apps/
│   └── api/
│       ├── cookies/              # Instagramcookies.json (runtime)
│       ├── logs/                 # Application logs (runtime)
│       └── src/
│           ├── secret/
│           │   └── index.ts      # Credential exports
│           ├── Agent/
│           │   ├── training/     # Training data (PDF, MP3, TXT, URLs)
│           │   └── characters/   # Personality JSON files
│           ├── client/
│           │   ├── Instagram.ts
│           │   └── IG-bot/         # Puppeteer IG client
│           └── config/
│               └── accounts.json # Multi-account (optional)
```

Install and run from the **repo root**:

```sh
pnpm install
pnpm dev          # or: pnpm start
```

## 2. Setup checklist

### Credentials

Place Instagram credentials in the root `.env`:

```env
IGusername=your_instagram_username
IGpassword=your_instagram_password
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/riona_ai_agent
DB_REQUIRED=false

# Optional
IG_AD_MARKERS=sponsored,paid partnership,paid partnership with
IG_AD_BUTTON_MARKERS=learn more,shop now,sign up
IG_AGENT_ENABLED=false
IG_AGENT_INTERVAL_MS=30000
IG_DAILY_MAX_ACTIONS=0
IG_RUN_PROFILE=standard
LOGGER=console

GEMINI_API_KEY=your_primary_gemini_api_key
```

Validate env: `pnpm check:env`

### Cookie management

- First run creates `apps/api/cookies/Instagramcookies.json`
- If cookie JSON is corrupted, delete the file and re-login via `/api/login`

## Posting & interactions

- `POST /api/post-photo` — image URL + caption
- `POST /api/schedule-post` — cron-scheduled post
- `POST /api/login` then `POST /api/interact` — manual agent run
- Set `IG_AGENT_ENABLED=true` for continuous loop

## Troubleshooting

- **No IG actions:** set `IG_AGENT_ENABLED=true` or call `/api/login` + `/api/interact`
- **Challenge screen:** login manually once; the agent records risk and applies cooldown
- **Cookie errors:** delete `apps/api/cookies/Instagramcookies.json` and restart

## 3. Agent training data

Supported input types in `apps/api/src/Agent/training/`:

- Text files (`.txt`)
- PDF documents
- Audio files (`.mp3`)
- Website URLs (via `pnpm train:link`)

See [Training.md](./Training.md) for commands.

## 4. Core customization points

| Area                                    | Location                                 |
| --------------------------------------- | ---------------------------------------- |
| Comment schema & tone rules             | `apps/api/src/Agent/schema/index.ts`     |
| IG client & interaction flow            | `apps/api/src/client/Instagram.ts`       |
| Puppeteer IG bot                        | `apps/api/src/client/IG-bot/IgClient.ts` |
| Personality JSON                        | `apps/api/src/Agent/characters/`         |
| Character loader                        | `apps/api/src/Agent/index.ts`            |
| Run profiles (safe/standard/aggressive) | `apps/api/src/config/igProfile.ts`       |
| Challenge risk & downgrade              | `apps/api/src/config/igRisk.ts`          |

To add a custom character:

1. Add `YourCharacter.json` to `apps/api/src/Agent/characters/`
2. Point `apps/api/src/Agent/index.ts` at your file (or use `adrian-style` config)

## 5. Running the bot

```sh
pnpm db:up          # optional: local Postgres
pnpm dev            # dev server on :3000
```

Open `http://localhost:3000/dashboard` for status, logs, and runtime config.

## 6. Safety

- Built-in delays and daily caps via `IG_RUN_PROFILE` and `IG_DAILY_MAX_ACTIONS`
- Sponsored-post filtering via `IG_AD_MARKERS`
- Challenge detection triggers cooldown and profile downgrade — see `apps/api/src/services/igChallenge.ts`
