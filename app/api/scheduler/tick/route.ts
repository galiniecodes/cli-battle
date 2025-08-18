import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Status } from '@prisma/client'

export async function POST() {
  try {
    const now = new Date()

    const dueReminders = await prisma.reminder.findMany({
      where: {
        status: Status.SCHEDULED,
        nextAttemptAt: {
          lte: now
        }
      },
      orderBy: {
        nextAttemptAt: 'asc'
      }
    })

    const processedCount = dueReminders.length

    for (const reminder of dueReminders) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          status: Status.CALLING,
          lastOutcome: 'Processing scheduled call'
        }
      })

      console.log(`Processing reminder ${reminder.id}: ${reminder.title}`)
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      message: `Processed ${processedCount} reminder(s)`
    })
  } catch (error) {
    console.error('Error in scheduler tick:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}