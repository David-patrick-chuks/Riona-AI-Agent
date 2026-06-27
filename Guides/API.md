# API Guide

Base URL: `http://localhost:3000/api` (when running `pnpm dev` or `pnpm start`).

Interactive docs: `GET /api/docs`

## Public endpoints

- `GET /api/ping` — load-balancer ping (`pong`)
- `GET /api/version` — build & uptime info
- `GET /api/health` — minimal health (extended when authenticated)
- `GET /api/config` — rate limits & limits (full config when authenticated)
- `GET /api/metrics` — uptime only (full metrics when authenticated)

## Auth

- `POST /api/login` → sets httpOnly token cookie
- `GET /api/me` → returns logged-in username
- `POST /api/logout` → clears token cookie

## Instagram actions (auth required)

- `POST /api/interact` → like/comment on feed
- `POST /api/dm` → send DM
- `POST /api/dm-file` → send DMs from file content
- `POST /api/post-photo` → post a photo by URL
- `POST /api/post-photo-file` → post a photo via multipart upload
- `POST /api/schedule-post` → schedule a photo post by URL + cron
- `POST /api/scrape-followers` → scrape followers list
- `GET /api/accounts` → account list + IG profile/risk summary

## Twitter / X (auth required)

- `POST /api/post-tweet` → text tweet
- `POST /api/twitter/post-media` → tweet with image
- `POST /api/twitter/like` → like a tweet
- `POST /api/twitter/retweet` → retweet
- `POST /api/twitter/reply` → reply to tweet
- `POST /api/twitter/schedule-tweet` → cron-scheduled tweet

## Maintenance

- `DELETE /api/clear-cookies` → delete IG cookies
- `POST /api/exit` → close IG client
- `GET /api/actions?limit=20` → recent action log feed
- `GET /api/actions/summary?limit=50` → summary counts
- `GET /api/admin/logs?limit=50` → application log lines
- `GET /api/admin/errors?limit=50` → failed actions and errors
- `GET /api/health?account=alt` → per-account IG status
- `GET /api/health?all=1` → all configured accounts

## Webhooks

- `GET /api/webhooks` — list webhooks
- `POST /api/webhooks` — create webhook
- `DELETE /api/webhooks/:id` — remove webhook
- `POST /api/webhooks/:id/test` — send test payload

## Dashboard

- `GET /dashboard` — admin UI (runtime config, Twitter panel, logs)

Source: `apps/api/src/routes/api.ts`
