# Training Guide

This project supports generating prompts or summaries from external content
and preparing “character” styles for the agent.

## Prerequisites
- Valid `GEMINI_API_KEY` (or `GEMINI_API_KEY_1..N`)
- `.env` configured

## Train from a website
Command:
```
npm run train:link
```
This runs `src/Agent/training/WebsiteScraping.ts` after build. Provide the
URL when prompted.

## Train from a YouTube URL
Command:
```
npm run train:youtube
```
This uses `src/Agent/training/youtubeURL.ts` to fetch transcripts and
create training prompts.

## Train from an audio file
Command:
```
npm run train:audio
```
This uses `src/Agent/training/TrainWithAudio.ts` to upload an audio file
and generate a summary or transcript.

## Character styles
Character JSON lives in `src/Agent/characters/`. At runtime, the agent will
load either `src/config/adrian-style` (if present) or fall back to the first
JSON character found.

## Output
Training scripts typically write structured data to `src/data/` or log
results to the console. Review and curate outputs before use.
