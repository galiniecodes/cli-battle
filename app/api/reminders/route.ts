import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Status } from '@prisma/client'
import { isE164, parseDate, requireString } from '@/lib/validation'

// GET /api/reminders - List all reminders ordered by created_at DESC
export async function GET() {
  try {
    const reminders = await prisma.reminder.findMany({
      orderBy: { created_at: 'desc' },
    })
    return NextResponse.json(reminders)
  } catch (err) {
    console.error('GET /api/reminders error', err)
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 })
  }
}

// POST /api/reminders - Create reminder with phone validation (E.164)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Validate inputs
    const title = requireString(body.title, 'title')
    const primary_phone = body.primary_phone
    const backup_phone_raw = body.backup_phone
    const scheduled_at_date = parseDate(body.scheduled_at, 'scheduled_at')

    if (!isE164(primary_phone)) {
      return NextResponse.json(
        { error: 'primary_phone must be E.164 format (e.g. +15551234567)' },
        { status: 400 },
      )
    }

    let backup_phone: string | null = null
    if (backup_phone_raw != null && backup_phone_raw !== '') {
      if (!isE164(backup_phone_raw)) {
        return NextResponse.json(
          { error: 'backup_phone must be E.164 format (e.g. +15551234567)' },
          { status: 400 },
        )
      }
      backup_phone = backup_phone_raw
    }

    // Defaults on creation
    const created = await prisma.reminder.create({
      data: {
        title,
        primary_phone,
        backup_phone,
        scheduled_at: scheduled_at_date,
        next_attempt_at: scheduled_at_date,
        attempts: 0,
        backup_attempts: 0,
        status: Status.SCHEDULED,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/reminders error', err)
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
