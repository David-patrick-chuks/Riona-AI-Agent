# Training Guide

Training scripts live in **`apps/api`** (`@riona/api`). Run them from the repo root via pnpm.

## Prerequisites

- Valid `GEMINI_API_KEY` (or `GEMINI_API_KEY_1..N`)
- `.env` at the repo root

## Train from a website

```sh
pnpm train:link
```

Runs `apps/api/src/Agent/training/WebsiteScraping.ts` after build. Provide the URL when prompted.

## Train from a YouTube URL

```sh
pnpm train:youtube
```

Uses `apps/api/src/Agent/training/youtubeURL.ts` to fetch transcripts and create training prompts.

## Train from an audio file

```sh
pnpm train:audio
```

Uses `apps/api/src/Agent/training/TrainWithAudio.ts` to upload an audio file and generate a summary or transcript.

## Character styles

Character JSON lives in `apps/api/src/Agent/characters/`. At runtime, the agent loads either `apps/api/src/config/adrian-style` (if present) or falls back to the first JSON character found.

## Output

Training scripts typically write structured data to `apps/api/src/data/` or log results to the console. Review and curate outputs before use.

## reCAPTCHA model training

The reCAPTCHA app is a separate workspace package under `apps/recaptcha/`:

```sh
pnpm recaptcha:dev
pnpm recaptcha:train
pnpm recaptcha:collect
pnpm recaptcha:build
pnpm recaptcha:serve
```

See [apps/recaptcha/README.md](../apps/recaptcha/README.md) for full details.
