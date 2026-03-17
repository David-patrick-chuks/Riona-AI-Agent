# Riona AI Agent Roadmap

This roadmap is based on the current codebase state and is meant to guide ongoing development. Items marked as completed are already implemented in the repository.

## Status Legend

<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e7f8ef;color:#0f7b47;border:1px solid #bfead4;font-size:12px;">Done</span>
<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#fff4e5;color:#8a4f00;border:1px solid #ffd9a8;font-size:12px;">In progress</span>
<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e9f1ff;color:#1d4ed8;border:1px solid #c7dbff;font-size:12px;">Planned</span>
<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#ffe9e9;color:#b42318;border:1px solid #ffc7c7;font-size:12px;">Blocked</span>

## Summary

- Current state: Instagram automation, AI content generation, training utilities, API server, dashboard, and reCAPTCHA ML subproject are present.
- Near term: Stabilize automation, finish Twitter/X pipeline, improve safety/rate limits, and harden ops.
- Long term: Multi‑platform expansion, richer training, analytics, and compliance tooling.

## Milestones

- [x] Core API server, auth, and health endpoints
- [x] Instagram automation (login, interact loop, posting, scheduling)
- [x] AI comment generation with Gemini + schema
- [x] Training utilities (YouTube, file parsing, website scraping)
- [x] Simple dashboard for health + last run
- [x] reCAPTCHA ML service (train/serve/admin UI)
- [ ] Twitter/X full workflow (compose, schedule, media, metrics)
- [ ] GitHub automation (planned)
- [ ] Analytics and reporting (cross‑platform)
- [ ] Production hardening and compliance features

## Phased Delivery

| Phase | Goals | Status |
| --- | --- | --- | --- |
| Phase 1 | Twitter/X MVP, IG reliability pass, admin UI basics | <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#fff4e5;color:#8a4f00;border:1px solid #ffd9a8;font-size:12px;">In progress</span> |
| Phase 2 | Analytics, observability, policy/rules engine, compliance guardrails | <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e9f1ff;color:#1d4ed8;border:1px solid #c7dbff;font-size:12px;">Planned</span> |
| Phase 3 | Multi‑platform orchestration, model evaluation + A/B, scale & cost controls | <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e9f1ff;color:#1d4ed8;border:1px solid #c7dbff;font-size:12px;">Planned</span> |

## Workstreams and Checklist

### 1) Platform Automation
- [x] Instagram browser automation (Puppeteer + stealth)
- [x] Instagram post by URL and file
- [x] Instagram scheduling (cron)
- [x] Instagram follower scraping
- [x] Cookie persistence and relogin handling
- [ ] Instagram reliability pass: captcha/challenge escalation workflow
- [ ] Instagram action throttling by risk profile (dynamic)
- [ ] Twitter/X end‑to‑end publish pipeline
- [ ] Twitter/X scheduling and media upload
- [ ] Twitter/X engagement actions (like/retweet/reply)
- [ ] GitHub automation: issues, PRs, releases

### 2) AI and Training
- [x] Gemini JSON‑schema generation for comments
- [x] API key rotation on rate limit
- [x] YouTube transcript ingestion
- [x] Audio and file‑based training ingestion
- [x] Website scraping for training data
- [ ] Prompt evaluation harness with golden datasets
- [ ] Multi‑persona training and selection
- [ ] Safety filters for toxic content and brand rules
- [ ] Model/agent selection and A/B testing

### 3) Data and Storage
- [x] MongoDB connection and models
- [x] Tweet schema for rate limiting
- [ ] Unified action log (IG/Twitter/GitHub)
- [ ] Content cache + dedupe layer
- [ ] Audit trail for moderation and compliance

### 4) API and Dashboard
- [x] REST API (login, interact, post, schedule)
- [x] /dashboard summary UI
- [x] Health endpoint
- [ ] Web UI for configuring accounts and profiles
- [ ] Admin panel for viewing actions, logs, and errors
- [ ] Webhook endpoints for external triggers
- [ ] API rate limiting and API keys for third‑party usage

### 5) Ops, Security, Reliability
- [x] Env validation scripts
- [x] Logging with Winston
- [x] Docker‑based MongoDB setup docs
- [ ] Secrets management for production (vault/parameter store)
- [ ] Observability: metrics + alerts
- [ ] CI coverage for integration tests
- [ ] Chaos testing for IG loops
- [ ] Legal/compliance guardrails and TOS risk toggles
 - [ ] Action audit logs and tamper‑evident storage
 - [ ] Automated rollback on error spikes
 - [ ] Rate‑limit aware backoff across providers

### 6) reCAPTCHA ML Subproject
- [x] Model architecture and training flow
- [x] Admin UI and debug views
- [x] Training data collection pipeline
- [x] Model serving endpoints
- [ ] Dataset versioning and quality checks
- [ ] Model performance tracking and drift detection
- [ ] Active learning loop for hard examples
 - [ ] Eval harness with fixed validation sets

## Timeline (High‑Level)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {
  'primaryColor': '#e9f1ff',
  'primaryTextColor': '#1d4ed8',
  'primaryBorderColor': '#c7dbff',
  'secondaryColor': '#e7f8ef',
  'secondaryTextColor': '#0f7b47',
  'secondaryBorderColor': '#bfead4',
  'tertiaryColor': '#fff4e5',
  'tertiaryTextColor': '#8a4f00',
  'tertiaryBorderColor': '#ffd9a8'
}}}%%
timeline
  title Riona AI Agent Roadmap
  Current (Done) : Core API + auth
                 : Instagram automation
                 : AI comment generation
                 : Training utilities
                 : Dashboard + health
                 : reCAPTCHA ML service
  Next (Planned) : Twitter/X full workflow
                 : Reliability + rate limiting
                 : Admin UI + config flows
                 : Analytics + reporting
  Later (Planned) : GitHub automation
                  : Compliance + safety controls
                  : Model evaluation + A/B testing
                  : Multi‑platform orchestration
```

## Architecture Coverage (Now vs Target)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {
  'fontFamily': 'Inter, Segoe UI, Arial',
  'primaryColor': '#e9f1ff',
  'primaryTextColor': '#1d4ed8',
  'primaryBorderColor': '#c7dbff',
  'lineColor': '#94a3b8'
}}}%%
flowchart LR
  subgraph Now
    A1[API Server] --> A2[Instagram Bot]
    A1 --> A3[Gemini Agent]
    A1 --> A4[MongoDB]
    A1 --> A5[Dashboard]
    A6[reCAPTCHA Service] --> A7[TFJS Model]
  end

  subgraph Target
    B1[API Gateway] --> B2[IG Bot]
    B1 --> B3[X/Twitter Bot]
    B1 --> B4[GitHub Bot]
    B1 --> B5[Analytics]
    B1 --> B6[Admin UI]
    B1 --> B7[Compliance]
    B8[Training Hub] --> B9[Eval + A/B]
  end

  classDef done fill:#e7f8ef,stroke:#0f7b47,color:#0f7b47;
  classDef active fill:#fff4e5,stroke:#8a4f00,color:#8a4f00;
  classDef planned fill:#e9f1ff,stroke:#1d4ed8,color:#1d4ed8;
  classDef target fill:#f6f7fb,stroke:#64748b,color:#334155;

  class A1,A2,A3,A4,A5,A6,A7 done;
  class B1,B2,B3,B4,B5,B6,B7,B8,B9 planned;
```

## Delivery Criteria (Release Gates)

| Gate | Criteria | Status |
| --- | --- | --- |
| Reliability | 7‑day crash‑free IG loop, < 3% challenge rate | <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e9f1ff;color:#1d4ed8;border:1px solid #c7dbff;font-size:12px;">Planned</span> |
| Security | Secrets not stored in repo, JWT/session hardened | <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e9f1ff;color:#1d4ed8;border:1px solid #c7dbff;font-size:12px;">Planned</span> |
| Quality | Integration tests for login/post/cron | <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e9f1ff;color:#1d4ed8;border:1px solid #c7dbff;font-size:12px;">Planned</span> |
| Observability | Metrics + alerts for errors and cooldowns | <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e9f1ff;color:#1d4ed8;border:1px solid #c7dbff;font-size:12px;">Planned</span> |

## KPI Targets (Suggested)

| Area | KPI | Baseline | Target | Notes |
| --- | --- | --- | --- | --- |
| Instagram | Successful interactions per run | TBD | +30% | Based on stable login + cooldowns |
| Instagram | Challenge rate | TBD | < 3% | Requires risk‑based throttling |
| AI Output | Avg comment engagement | TBD | +25% | Needs analytics + tracking |
| Reliability | Crash‑free loop runs | TBD | 99% | Add watchdog + retries |
| ML Model | reCAPTCHA accuracy | TBD | > 92% | Track via validation set |

## Risks and Mitigations

| Risk | Impact | Mitigation | Status |
| --- | --- | --- | --- |
| IG challenges / bans | High | Dynamic throttling, cooldowns, better fingerprinting | <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#fff4e5;color:#8a4f00;border:1px solid #ffd9a8;font-size:12px;">In progress</span> |
| Provider rate limits | Medium | Key rotation, backoff, queueing | <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e7f8ef;color:#0f7b47;border:1px solid #bfead4;font-size:12px;">Done</span> |
| Data quality drift | Medium | Validation sets, drift monitoring | <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e9f1ff;color:#1d4ed8;border:1px solid #c7dbff;font-size:12px;">Planned</span> |
| Compliance exposure | High | Policy rules, opt‑out, audit logs | <span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#e9f1ff;color:#1d4ed8;border:1px solid #c7dbff;font-size:12px;">Planned</span> |

## Dependencies

- Stable access to IG and X/Twitter APIs or browser‑automation compatibility.
- Gemini API key availability and quota.
- MongoDB availability for persistence and logging.
- Proxy infrastructure if scaling across multiple accounts.

## Quality and Testing Strategy

- Unit tests for utilities and schema constraints.
- Integration tests for login, posting, scheduling, and cooldown behavior.
- Load tests for API endpoints and training pipelines.
- Regression suite for prompt outputs and content safety filters.

## Backlog (Unscheduled)

- [ ] Mobile‑friendly dashboard
- [ ] Multi‑account policy/rules engine
- [ ] Task queue (BullMQ/Redis)
- [ ] Content calendar and approvals
- [ ] Per‑account proxy assignment
- [ ] Pluggable model providers (OpenAI, local)
 - [ ] Data retention and deletion policies
 - [ ] Webhook‑based partner integrations
