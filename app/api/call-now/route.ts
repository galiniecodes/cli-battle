import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processDueReminders } from '@/lib/scheduler'

// POST /api/call-now { id }
// - Sets reminder status to SCHEDULED and next_attempt_at=now
// - Invokes /api/scheduler/tick to process immediately
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { id?: string } | null
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const now = new Date()
    const updated = await prisma.reminder.update({
      where: { id: body.id },
      data: {
        status: 'SCHEDULED',
        next_attempt_at: now,
      },
    }).catch((e) => {
      if ((e as any)?.code === 'P2025') return null
      throw e
    })

    if (!updated) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
    }

    // Trigger scheduler inline to ensure immediate processing locally
    try {
      await processDueReminders(10)
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/call-now error', err)
    return NextResponse.json({ error: 'Failed to trigger call' }, { status: 500 })
  }
}
