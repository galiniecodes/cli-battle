# Scheduled Phone Call Reminder System

A Next.js application that enables users to schedule automated phone call reminders with retry attempts, backup contact escalation, and real-time status tracking.

## Project Milestones

### ✅ Milestone 1 (M1) - Data Layer & CRUD Operations
**Status: Complete**

Implemented the foundational data layer with PostgreSQL and Prisma ORM, including:
- **Database Schema:**
  - `reminders` table with fields for scheduling, phone numbers, retry attempts, and status tracking
  - `call_logs` table for recording call history and outcomes
  - Status enum: SCHEDULED, CALLING, RETRYING, DONE, ESCALATED
- **REST API Endpoints:**
  - `POST /api/reminders` - Create reminders with E.164 phone validation
  - `GET /api/reminders` - List all reminders sorted by newest first
- **Default Values:** Automatically sets status="SCHEDULED", attempts=0, next_attempt_at=scheduled_at

### ✅ Milestone 2 (M2) - Web Dashboard
**Status: Complete**

Built a comprehensive web dashboard for managing phone call reminders:
- **Dashboard Page (`/dashboard`):**
  - Form to create new reminders with title, primary/backup phones, and scheduled time
  - Real-time table displaying all reminders with auto-refresh every 5 seconds
  - Color-coded status badges: 🟢 DONE, 🟡 CALLING, 🔴 ESCALATED, 🔵 SCHEDULED, 🟠 RETRYING
  - "Call Now" button for immediate call triggering
  - Responsive design for mobile and desktop
- **API Endpoints:**
  - `POST /api/call-now` - Reset reminder to trigger immediate call
  - `POST /api/scheduler/tick` - Process due reminders (stub implementation)
- **Features:**
  - E.164 phone format validation on both client and server
  - Optimistic UI updates with loading states
  - Clear error messages and user feedback
  - Enhanced text visibility for better user experience

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
