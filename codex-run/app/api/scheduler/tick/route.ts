import { NextResponse } from 'next/server'
import { runSchedulerTick } from '@/lib/scheduler'

// Minimal scheduler: move due SCHEDULED/RETRYING reminders into CALLING state
// This is a simple placeholder to satisfy dashboard interactions in M2.
export async function POST() {
  try {
    console.log('[tick] starting scheduler tick')
    const summary = await runSchedulerTick(10)
    console.log('[tick] summary', summary)
    return NextResponse.json(summary)
  } catch (err) {
    console.error('POST /api/scheduler/tick error', err)
    return NextResponse.json({ error: 'Scheduler error' }, { status: 500 })
  }
}
