# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Expert Fundraising Hub — web app for Alex Morrison's *Foundations of Donor Alignment* course. Participants fill in three worksheets; an LLM drafts personalized coaching feedback in Alex's voice; an admin reviews/edits/approves the draft before delivery.

## Commands

```bash
npm run dev     # next dev (port 3000)
npm run build   # next build
npm run start   # next start
npm run lint    # eslint
```

No test suite is configured. Node 22 (`.node-version`). Package manager: npm (`package-lock.json`).

## Stack

- Next.js 16 App Router + React 19 + TypeScript (strict)
- Tailwind v4 + shadcn/ui (`style: base-nova`, `baseColor: neutral`, icon lib: lucide) — config in `components.json`
- Supabase (Postgres + service role from server; `@supabase/ssr` for the browser client)
- OpenRouter → Anthropic (default `anthropic/claude-sonnet-4`)
- Zod for request validation, react-hook-form for forms
- Fonts: Playfair Display (heading) + DM Sans (sans) via `next/font/google`
- TS path alias: `@/*` → repo root

## Architecture

### Participant flow (public)

- `/` is the public landing page (`app/page.tsx`) — collects email, calls `GET /api/participant?email=`, computes the next incomplete worksheet, and routes to `/form?email=X&worksheet=N`. If all 3 worksheets are complete, it shows a "you're all set" message instead of redirecting. The `/form` route still accepts direct `?email=X&worksheet=N` URLs for GHL deep-linking.
- `app/form/page.tsx` is a single client page with three render modes: `typeform` (one-question-at-a-time, no auto-advance, explicit Next button), `review` (returning users see/edit existing answers), `complete`.
- Worksheet 1 prepends a synthetic `_name` question — that's how we capture the participant's name on first visit. Worksheets 2 and 3 do NOT collect name; they rely on the existing participant row.
- Each worksheet posts to `POST /api/submit-worksheet` which upserts the participant by email, upserts the worksheet submission (`unique(participant_id, worksheet_number)`), and — when all 3 worksheets exist — upserts a `feedback_jobs` row with `status='pending'`.
- Question definitions live in `lib/form/questions.ts`. The Zod schemas in `app/api/submit-worksheet/route.ts` and `app/api/submit/route.ts` must stay in sync with them.
- `POST /api/submit` is a legacy endpoint that accepts all three worksheets at once. Current UI does not use it; keep it working but new code should prefer `/api/submit-worksheet`.

### Feedback generation (fire-and-forget)

Vercel functions have short timeouts, so generation is split across two routes:

1. `POST /api/generate` (admin-triggered) — marks the job `generating`, returns 202 immediately, then `fetch(/api/generate/run)` without awaiting.
2. `POST /api/generate/run` (worker, `maxDuration = 60`) — loads worksheets, loads the active `prompt_configs` row, calls `generateFeedback()`, writes `ai_draft` + `human_edit` (seeded identical) and sets `status='draft'`. Errors reset status to `pending` with `error_message`.

The same pattern runs on a schedule via `vercel.json` → daily cron at `/api/cron/trigger-feedback` (Bearer `CRON_SECRET`). That endpoint picks up `pending` jobs whose participants are past the time gate (configurable via `app_settings` keys `time_gate_enabled` and `time_gate_days`) and kicks off `/api/generate/run` for each.

### LLM call

- `lib/openrouter/client.ts` — minimal wrapper around `POST https://openrouter.ai/api/v1/chat/completions`. When `reasoning` is passed and model is Anthropic, temperature is forced to 1 (Anthropic thinking constraint).
- `lib/ai/generate-feedback.ts` — builds the user prompt, runs the completion, parses JSON with a strict retry (`"Your previous response was not valid JSON..."`), and returns `{worksheet_1, worksheet_2, worksheet_3}`. It falls back to the baked-in `DEFAULT_SYSTEM_PROMPT` if no active `prompt_configs` row exists.
- Worksheet 3 feedback MUST close with the exact sentence: *"How will this awareness prepare you for your next donor meeting?"* — enforced via prompt, not code.

### Admin flow (cookie-gated)

- `middleware.ts` protects `/admin/*` (except `/admin/login`) by checking the `admin_session=authenticated` cookie.
- `POST /api/admin/login` compares body password against `ADMIN_PASSWORD` env var and sets the cookie (24h). All admin API routes re-check the cookie server-side.
- `app/admin/page.tsx` is `force-dynamic` and enriches each participant row with worksheet count + feedback status.
- Admin can edit/version the system prompt (`/admin/prompts`) — `prompt_configs` has a partial unique index so only one row can be active. Saving inserts a new version and flips the flag.
- Admin reviews drafts at `/admin/review/[participantId]` and approves via `POST /api/approve`, which writes `human_edit` + `reviewer_notes`, sets `status='approved'`, then fire-and-forgets a delivery webhook to n8n (see below).

### Delivery pipeline (n8n)

After approval, the app hands off to an n8n cloud workflow that produces the PDF and emails the participant. The app does not touch Google APIs directly.

1. `POST /api/approve` (after DB update) — loads participant + all 3 worksheet answers, builds the payload below, and POSTs it to `N8N_WEBHOOK_URL` with header `X-Webhook-Secret: $N8N_CALLBACK_SECRET`. Includes `callbackUrl` so the n8n workflow can call back into whatever app URL is current.
2. **n8n workflow `EFH — Deliver Feedback PDF`** (`expertfundraising17.app.n8n.cloud`, id `7KA1rR3pxTOlQfhh`):
   - Webhook (path `efh-delivery`, Header Auth) → Google Drive *Copy* of template `1gwH60wh5AuUq2Do6LjNsgiB8B5OP6MVXP_oOXd2p0Y8` → Google Docs *Update* with 15 `replaceAll` actions → Google Drive *Download* with `docsToFormat: application/pdf` → Gmail *Send* with the PDF attached → HTTP Request back to `callbackUrl`.
   - The 15 tokens it replaces are defined in `~/Documents/Atlas/projects/optevo/expert-fundraising/google-doc-template.md`. Any edit to the template must keep the `{{snake_case}}` tokens intact.
3. `POST /api/delivery-callback` — authenticated by `X-Webhook-Secret`. Body: `{ participantId, status: 'sent'|'error', errorMessage?, docId? }`. On `sent` it sets `status='sent'` + `sent_at`. On `error` it sets `error_message` but leaves `status='approved'` so the admin can retry by clicking Approve again.

**Payload shape (`/api/approve` → n8n):**

```
{ participantId, participantName, participantEmail, callbackUrl,
  feedback: { worksheet_1, worksheet_2, worksheet_3 },        // from human_edit
  answers:  { worksheet_1: {...}, worksheet_2: {...}, worksheet_3: {...} } }
```

**Retry semantics:** there is no automatic retry. If delivery fails and n8n calls back with `error`, admin re-clicks Approve to re-fire the webhook. If n8n can't reach the callback at all, the job stays `approved` and `sent_at` is null — an operator can inspect the n8n execution log.

## Database

Migrations live in `supabase/migrations/` and are intended to be applied in order (001 → 005). Authoritative schema lives here; `types/database.ts` mirrors it for the app. Schema highlights:

- `participants` — `email` unique, `name NOT NULL` (first-time capture happens in worksheet 1).
- `worksheet_submissions` — `unique(participant_id, worksheet_number)`; `answers` is JSONB validated per-worksheet by Zod in the API route.
- `feedback_jobs` — one-to-one with participant (`participant_id` is unique). Status enum: `pending → generating → draft → approved → sent`. `ai_draft` is immutable once set; `human_edit` is what the admin edits.
- `prompt_configs` — versioned, partial unique index on `is_active = true`.
- `app_settings` — key/JSONB value store for feature flags (currently the time gate).

Supabase MCP is configured in `.mcp.json` pointing at project ref `uwmugthxwcaoezawsgkp`. Use `mcp__supabase__execute_sql` / `apply_migration` to run migrations; falling back to the SQL editor works too.

## Supabase clients

- **Server (`lib/supabase/server.ts`)** — `createServiceClient()` uses `SUPABASE_SERVICE_ROLE_KEY`. Use this in every API route and server component; it bypasses RLS intentionally (there are no RLS policies — auth is handled at the Next.js layer via the admin cookie).
- **Browser (`lib/supabase/client.ts`)** — `createClient()` uses the anon key via `@supabase/ssr`. Currently no client component reads Supabase directly (everything goes through API routes), but the helper is available.

## Environment variables

See `env.example`. All of these are required to run locally:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENROUTER_API_KEY
ADMIN_PASSWORD
CRON_SECRET
NEXT_PUBLIC_APP_URL   # used by fire-and-forget self-calls; set to http://localhost:3000 locally
N8N_WEBHOOK_URL
N8N_CALLBACK_SECRET
```

`NEXT_PUBLIC_APP_URL` matters: `/api/generate`, `/api/cron/trigger-feedback`, and `/api/approve` all use it. `/api/approve` passes it as the `callbackUrl` in the n8n payload — so if it's wrong in Vercel, generation silently fails AND n8n has nowhere to report delivery status.

`N8N_CALLBACK_SECRET` is shared on both sides: the n8n `EFH Webhook Secret` Header Auth credential uses `X-Webhook-Secret: <value>`, and the app validates the same header on `/api/delivery-callback`.
