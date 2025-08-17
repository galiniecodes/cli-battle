This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Scheduled Phone Call Reminder System (M1)

Data layer and CRUD endpoints for scheduling phone call reminders.

- PostgreSQL via Prisma with `Reminder` and `CallLog` models
- REST API `/api/reminders` with `GET` and `POST`

### Milestones

- M1 — Data Layer & CRUD Operations: Created
- M2 — Web Dashboard: Created
- M3 — Scheduler & Processing Engine: Created

### Environment

Copy `.env.example` to `.env` and set values:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/yourdb?schema=public"
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_auth_token"
TWILIO_PHONE_NUMBER="+15551234567"
APP_BASE_URL="http://localhost:3000"
```

### Setup

- Install dependencies: `npm install`
- Generate Prisma client: `npm run db:generate`
- Run migrations: `npm run db:migrate`
- (Optional) Seed sample data: `npm run db:seed`
- Start dev server: `npm run dev`

### API

Endpoint: `/api/reminders`

- `GET` — list all reminders ordered by `created_at` DESC
- `POST` — create a reminder. Body fields:
  - `title` (string, required)
  - `primary_phone` (E.164, required, e.g. `+15551234567`)
  - `backup_phone` (E.164, optional)
  - `scheduled_at` (ISO string, required)

Defaults on creation:

- `status = SCHEDULED`
- `attempts = 0`, `backup_attempts = 0`
- `next_attempt_at = scheduled_at`

### Curl Examples

Create (201):

```
curl -s -X POST http://localhost:3000/api/reminders \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Dentist Appointment",
    "primary_phone": "+15551234567",
    "backup_phone": "+15557654321",
    "scheduled_at": "2025-01-01T09:00:00.000Z"
  }'
```

Invalid phone (400):

```
curl -s -X POST http://localhost:3000/api/reminders \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Bad Phone",
    "primary_phone": "+123",
    "scheduled_at": "2025-01-01T09:00:00.000Z"
  }'
```

List (GET):

```
curl -s http://localhost:3000/api/reminders | jq
```

### Notes

- Phone validation enforces E.164 with 10–15 digits (`+` followed by digits), rejecting inputs like `+123` or `555-1234`.
- Server timezone is used as-is; no timezone conversion is performed.

---

## Web Dashboard (M2)

Interactive dashboard to create reminders and monitor real-time status.

### UI

- Path: `/dashboard`
- Create form fields: `title`, `primary_phone`, `backup_phone` (optional), `scheduled_at`
- Client validation: E.164 for phone numbers (e.g., `+15551234567`)
- Table columns: `title`, `status`, `attempts`, `next_attempt_at`, `last_outcome`, `created_at`
- Status badges:
  - Blue = `SCHEDULED`
  - Yellow = `CALLING`
  - Orange = `RETRYING`
  - Green = `DONE`
  - Red = `ESCALATED`
- Actions: "Call Now" button per reminder
- Auto-refresh: every 5 seconds (client polling)

### Endpoints

- `POST /api/call-now`
  - Body: `{ "id": "<reminder_id>" }`
  - Sets `status = SCHEDULED` and `next_attempt_at = now`
  - Immediately runs a minimal scheduler to move due items to `CALLING`
  - Response: `{ ok: true }` on success

- `POST /api/scheduler/tick`
  - Minimal scheduler for M2
  - Moves due reminders (`status in [SCHEDULED, RETRYING]` and `next_attempt_at <= now`) to `CALLING`, increments `attempts`, sets `last_outcome = "Call initiated"`, clears `next_attempt_at`
  - Response: `{ processed: <number> }`

### Testing Checklist

UI Functionality

- Form successfully creates new reminders
- Phone validation prevents invalid formats in form
- Table displays all reminders with correct data
- Status badges show appropriate colors
- Auto-refresh updates table without page reload

Call Now Feature

- "Call Now" button triggers immediate processing
- Reminder status changes to `CALLING` after click
- Returns success/error feedback to user

### Notes (M2)

- Server also validates phone numbers (E.164) on `POST /api/reminders`.
- `APP_BASE_URL` is optional for M2; the "Call Now" route triggers the scheduler inline for reliable local behavior.
- Full Twilio integration, retries, escalation, and IVR flow come in later milestones.

---

## Scheduler & Processing Engine (M3)

Implements end-to-end reminder processing with Twilio calls, retries, escalation, IVR input, and a real-time tick endpoint.

### Features

- Scheduler Tick (`POST /api/scheduler/tick`):
  - Finds due reminders (`next_attempt_at <= now` and `status in [SCHEDULED, RETRYING, ESCALATED]`).
  - Atomically reserves items (moves to `CALLING`) with guarded `updateMany` to avoid double processing.
  - Selects dial target: primary if `attempts < 1`; when `ESCALATED`, backup if `backup_attempts < 1`.
  - Initiates Twilio call with webhooks and creates `CallLog` (`call_sid`).
  - On initiation failure, logs an error entry and escalates or completes per rules.
  - Auto-advances exhausted items: primary exhausted → `ESCALATED` (if backup) or `DONE`; backup exhausted → `DONE`.
  - Returns JSON summary: `{ due_found, reserved, calls_initiated, skipped, errors }`.

- Retry & Escalation Rules:
  - Primary attempts: max 1; on failure → `ESCALATED` (+1 min delay) if backup exists else `DONE`.
  - Backup attempts: max 1; on failure → `DONE`.
  - Manual re-arm via `POST /api/call-now` resets attempts by default.

- Twilio Integration:
  - Outbound call initiation using REST API with `Url` → `/api/voice/answer` and `StatusCallback` → `/api/voice/status`.
  - IVR with `<Gather>` at `/api/voice/answer`:
    - Press 1 to confirm → marks `DONE`.
    - Press 9 to snooze → `RETRYING` with `next_attempt_at = now + 1 min`.
  - Status callbacks at `/api/voice/status` update state: `completed` → `DONE`; primary failures → `ESCALATED` or `DONE`; backup failures → `DONE`.

- Server Logging:
  - Scheduler, Twilio initiation, and webhooks emit concise logs with masked phone numbers and short IDs.

### Endpoints

- `POST /api/scheduler/tick`
  - Triggers one processing tick. Response example:
    ```json
    { "due_found": 3, "reserved": 2, "calls_initiated": 2, "skipped": 1, "errors": 0 }
    ```

- `POST /api/call-now`
  - Body: `{ "id": "<reminder_id>", "reset": true }` (default `reset=true`).
  - Sets `status = SCHEDULED`, `next_attempt_at = now`; when `reset=true`, also resets `attempts` and `backup_attempts`.

- `POST /api/voice/answer` (Twilio fetches; also responds to GET for testing)
  - Returns TwiML with `<Gather>` (1 digit) and safe XML-escaped action URL.

- `POST /api/voice/gather` (Twilio posts digits)
  - `Digits=1` → mark `DONE`.
  - `Digits=9` → `RETRYING` with +1 minute snooze.

- `POST /api/voice/status` (Twilio posts call status)
  - Logs status and drives retry/escalation/complete transitions.

### Environment

- Required: `DATABASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `APP_BASE_URL`.
- Mock mode (local/offline): set `TWILIO_MOCK=1` to simulate call initiation (no external request); scheduler still logs and writes `CallLog` with a mock SID.

### Ngrok Setup (for real calls)

- Run `ngrok http 3000` and copy the HTTPS URL.
- Set `APP_BASE_URL` to the ngrok HTTPS URL (no trailing slash), restart dev server.
- Twilio trial: you can only call verified destination numbers; the `From` must be your Twilio voice-enabled number.
- Tip: Open `GET $APP_BASE_URL/api/voice/answer?rid=test&target=primary` in a browser to verify valid TwiML (XML) is returned.

### Common Pitfalls

- Missing or wrong `APP_BASE_URL` → Twilio cannot reach webhooks.
- Trial calling unverified numbers → Twilio rejects.
- Invalid `From` number (not your Twilio voice-enabled number) → API error.
- TwiML XML errors (12100): ensure `<Response>` root and properly escaped `&` in attribute URLs; this repo’s `answer` route handles escaping.

### Quick Testing Flow

1. Create a reminder with `scheduled_at` in the past (or use the dashboard’s Call Now).
2. POST `/api/scheduler/tick` to process. Watch server logs for:
   - `[scheduler] reserved …`, `[twilio] create call …`, and status callbacks (`[voice:status] …`).
3. For offline tests, set `TWILIO_MOCK=1` and repeat — you should see mock SIDs and logs without external calls.
