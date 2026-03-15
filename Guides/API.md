# API Guide

## Auth
- `POST /api/login` -> sets httpOnly token cookie
- `GET /api/me` -> returns logged-in username
- `POST /api/logout` -> clears token cookie

## Instagram actions
- `POST /api/interact` -> like/comment on feed
- `POST /api/dm` -> send DM
- `POST /api/dm-file` -> send DMs from file content
- `POST /api/scrape-followers` -> scrape followers list

## Maintenance
- `DELETE /api/clear-cookies` -> delete IG cookies
- `POST /api/exit` -> close IG client
