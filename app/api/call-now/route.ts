import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Status } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reminderId } = body

    if (!reminderId) {
      return NextResponse.json(
        { error: 'Reminder ID is required' },
        { status: 400 }
      )
    }

    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId }
    })

    if (!reminder) {
      return NextResponse.json(
        { error: 'Reminder not found' },
        { status: 404 }
      )
    }

    if (reminder.status === 'CALLING') {
      return NextResponse.json(
        { error: 'Reminder is already being called' },
        { status: 400 }
      )
    }

    const updatedReminder = await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: Status.SCHEDULED,
        nextAttemptAt: new Date(),
        attempts: 0,
        backupAttempts: 0,
        lastOutcome: null
      }
    })

    const schedulerUrl = process.env.APP_BASE_URL 
      ? `${process.env.APP_BASE_URL}/api/scheduler/tick`
      : `http://localhost:${process.env.PORT || 3001}/api/scheduler/tick`
      
    try {
      const schedulerResponse = await fetch(schedulerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      })

      if (!schedulerResponse.ok) {
        console.error('Scheduler tick failed, but reminder was updated')
      }
    } catch (schedulerError) {
      console.error('Failed to trigger scheduler:', schedulerError)
    }

    return NextResponse.json({
      success: true,
      reminder: updatedReminder
    })
  } catch (error) {
    console.error('Error in call-now:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}