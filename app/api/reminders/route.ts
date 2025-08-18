import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Status } from '@prisma/client'
import { validateE164Phone } from '@/lib/phone-utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, primaryPhone, backupPhone, scheduledAt } = body

    if (!title || !primaryPhone || !scheduledAt) {
      return NextResponse.json(
        { error: 'Missing required fields: title, primaryPhone, scheduledAt' },
        { status: 400 }
      )
    }

    if (!validateE164Phone(primaryPhone)) {
      return NextResponse.json(
        { error: 'Primary phone must be in E.164 format (e.g., +1234567890)' },
        { status: 400 }
      )
    }

    if (backupPhone && !validateE164Phone(backupPhone)) {
      return NextResponse.json(
        { error: 'Backup phone must be in E.164 format (e.g., +1234567890)' },
        { status: 400 }
      )
    }

    const scheduledDate = new Date(scheduledAt)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduledAt date' },
        { status: 400 }
      )
    }

    const reminder = await prisma.reminder.create({
      data: {
        title,
        primaryPhone,
        backupPhone: backupPhone || null,
        scheduledAt: scheduledDate,
        nextAttemptAt: scheduledDate,
        status: Status.SCHEDULED,
        attempts: 0,
        backupAttempts: 0
      }
    })

    return NextResponse.json(reminder, { status: 201 })
  } catch (error) {
    console.error('Error creating reminder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const reminders = await prisma.reminder.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        callLogs: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    return NextResponse.json(reminders)
  } catch (error) {
    console.error('Error fetching reminders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}