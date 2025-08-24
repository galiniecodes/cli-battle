### **Project Name:**

Scheduled Phone Call Reminder System

### **Overview:**

A Next.js application that enables users to schedule automated phone call reminders for important events, with retry attempts, backup contact escalation, interactive
voice responses, and a real-time status dashboard.

### **Key Features:**

1. **Scheduled Phone Call Reminders** – Users schedule automated phone calls for specific times
2. **Retry Mechanism** – Up to 1 retry attempts for primary phone, 1 for backup phone
3. **Escalation System** – Automatic failover to backup contact after repeated missed calls
4. **Interactive Voice Response** – Recipients can confirm or snooze reminders via voice commands or keypad
5. **Status Dashboard** – Real-time table showing all reminders with color-coded statuses and call history
6. **Local Development & Testing** – Fully functional locally with Twilio webhooks via ngrok

### **Technical Stack:**

- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL with Prisma ORM
- **Voice Calls:** Twilio API with `<Gather>` for input collection
- **Scheduler:** Manual trigger via `/api/scheduler/tick` endpoint (cron-ready)
- **UI:** React with Tailwind CSS, auto-refresh every 5 seconds
- **Timezone:** Server timezone (no timezone conversion)
- **Environment Variables:**
  - `DATABASE_URL` - PostgreSQL connection string
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` - Twilio credentials
  - `APP_BASE_URL` - Application base URL for webhooks

### **Ground Rules:**

- Keep as **single Next.js app** (App Router), you are provided with scaffolded nextjs app.
- Do **not** change major tech stack choices without explicit approval.
- Always produce working, testable code at each milestone.
- **Automated testing is not required** — testing will be performed manually by engineering after delivery.

## **Coding Style & Quality Requirements**

1. **Keep It Simple, Stupid (KISS)**
   - Favor straightforward, readable solutions over overly clever code.
   - Avoid unnecessary abstractions until truly needed.
2. **Don’t Repeat Yourself (DRY)**
   - Factor out reusable logic into functions/modules.
   - No copy-pasting code across routes, components, or utilities.
3. **Clean & Consistent Structure**
   - Use clear, consistent folder and file naming conventions.
   - Keep related logic close together (e.g., API route + related DB functions in `/lib`).
4. **Readable Code**
   - Use descriptive variable, function, and file names.
   - Add concise comments only where necessary to clarify intent.
5. **Minimal Dependencies**
   - Add packages only if they provide significant value.
   - Remove unused imports or packages.
6. **Error Handling**
   - Validate all inputs before processing.
   - Fail gracefully with clear error messages in API responses and logs.
7. **Avoid Premature Optimization**
   - Prioritize clarity and correctness first.
   - Optimize only when you’ve identified a real bottleneck.
8. **Security Basics**
   - Sanitize all user inputs.
   - Never log secrets or sensitive information.
