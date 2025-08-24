# CLI Battle

A comparison repository containing two implementations of the same phone call reminder system built with different AI coding assistants.

## Structure

- **`claude-run/`** - Implementation built with Claude
- **`codex-run/`** - Implementation built with another AI assistant  
- **`prompts/`** - Project prompts and milestones (M1-M4)

## Project Overview

Both implementations are scheduled phone call reminder systems with:
- Automated phone calls via Twilio
- Retry logic and backup contact escalation
- Interactive voice response (IVR) 
- Real-time status dashboard
- PostgreSQL database with Prisma ORM

## Tech Stack

- Next.js (App Router)
- PostgreSQL + Prisma
- Twilio API for voice calls
- React + Tailwind CSS