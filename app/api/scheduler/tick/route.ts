import { NextResponse } from 'next/server'
import { processDueReminders } from '@/lib/scheduler'

// Minimal scheduler: move due SCHEDULED/RETRYING reminders into CALLING state
// This is a simple placeholder to satisfy dashboard interactions in M2.
export async function POST() {
  try {
    const processed = await processDueReminders(10)
    return NextResponse.json({ processed })
  } catch (err) {
    console.error('POST /api/scheduler/tick error', err)
    return NextResponse.json({ error: 'Scheduler error' }, { status: 500 })
  }
}
