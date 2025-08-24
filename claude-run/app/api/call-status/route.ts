import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseCallOutcome } from '@/lib/twilio'
import { Status } from '@prisma/client'

const MAX_PRIMARY_ATTEMPTS = 1
const MAX_BACKUP_ATTEMPTS = 1
const RETRY_DELAY_MS = 60000 // 1 minute

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const searchParams = request.nextUrl.searchParams
    
    const reminderId = searchParams.get('reminderId')
    const callStatus = formData.get('CallStatus') as string
    const callSid = formData.get('CallSid') as string
    const callDuration = formData.get('CallDuration') as string
    
    if (!reminderId || !callStatus || !callSid) {
      return new NextResponse('OK', { status: 200 })
    }
    
    const reminderIdNum = parseInt(reminderId, 10)
    const { shouldRetry, isSuccess, outcome, isIntermediate } = parseCallOutcome(callStatus)
    
    await prisma.callLog.create({
      data: {
        reminderId: reminderIdNum,
        callSid,
        outcome: `status_${outcome}`,
        transcript: `Call duration: ${callDuration || '0'} seconds`
      }
    })
    
    // If this is an intermediate status (initiated, ringing, in-progress), just log and return
    if (isIntermediate) {
      console.log(`Received intermediate status '${callStatus}' for reminder ${reminderId}`)
      return new NextResponse('OK', { status: 200 })
    }
    
    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderIdNum }
    })
    
    if (!reminder || reminder.status === Status.DONE) {
      return new NextResponse('OK', { status: 200 })
    }
    
    // Handle completed calls specially - check if there was actual confirmation
    let treatAsNoAnswer = false
    
    if (isSuccess && callStatus === 'completed') {
      const gatherLog = await prisma.callLog.findFirst({
        where: {
          reminderId: reminderIdNum,
          callSid,
          intent: { in: ['confirmed', 'snoozed'] }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      if (gatherLog?.intent === 'confirmed' || gatherLog?.intent === 'snoozed') {
        // Call was properly handled through gather
        return new NextResponse('OK', { status: 200 })
      }
      
      // Call was completed but no confirmation received - treat as no-answer
      // This happens when call goes to voicemail or rings out
      console.log(`Call completed without confirmation for reminder ${reminderId}, treating as no-answer`)
      
      await prisma.callLog.create({
        data: {
          reminderId: reminderIdNum,
          callSid,
          outcome: 'completed_no_confirmation',
          transcript: 'Call completed without explicit confirmation - treating as no-answer'
        }
      })
      
      // Mark this to be treated as no-answer
      treatAsNoAnswer = true
    }
    
    if (!shouldRetry && !treatAsNoAnswer) {
      await prisma.reminder.update({
        where: { id: reminderIdNum },
        data: {
          status: Status.DONE,
          lastOutcome: `Call ended: ${outcome}`
        }
      })
      
      return new NextResponse('OK', { status: 200 })
    }
    
    // For treatAsNoAnswer or shouldRetry cases, handle retry/escalation
    const isBackupCall = reminder.status === Status.ESCALATED
    
    if (isBackupCall) {
      const newBackupAttempts = reminder.backupAttempts + 1
      
      if (newBackupAttempts >= MAX_BACKUP_ATTEMPTS) {
        await prisma.reminder.update({
          where: { id: reminderIdNum },
          data: {
            status: Status.DONE,
            backupAttempts: newBackupAttempts,
            lastOutcome: `Max backup attempts (${MAX_BACKUP_ATTEMPTS}) reached - ${outcome}`
          }
        })
        
        await prisma.callLog.create({
          data: {
            reminderId: reminderIdNum,
            callSid,
            outcome: 'max_attempts_backup',
            transcript: `Final backup attempt failed: ${outcome}`
          }
        })
      } else {
        const nextAttempt = new Date(Date.now() + RETRY_DELAY_MS)
        
        await prisma.reminder.update({
          where: { id: reminderIdNum },
          data: {
            status: Status.ESCALATED,
            backupAttempts: newBackupAttempts,
            nextAttemptAt: nextAttempt,
            lastOutcome: `Backup attempt ${newBackupAttempts} failed (${outcome}), retrying`
          }
        })
        
        await prisma.callLog.create({
          data: {
            reminderId: reminderIdNum,
            callSid,
            outcome: 'retry_backup_scheduled',
            transcript: `Backup retry scheduled for ${nextAttempt.toISOString()}`
          }
        })
      }
    } else {
      const newAttempts = reminder.attempts + 1
      
      if (newAttempts >= MAX_PRIMARY_ATTEMPTS) {
        if (reminder.backupPhone) {
          const nextAttempt = new Date(Date.now() + RETRY_DELAY_MS)
          
          await prisma.reminder.update({
            where: { id: reminderIdNum },
            data: {
              status: Status.ESCALATED,
              attempts: newAttempts,
              nextAttemptAt: nextAttempt,
              lastOutcome: `Primary attempts exhausted (${outcome}), escalating to backup`
            }
          })
          
          await prisma.callLog.create({
            data: {
              reminderId: reminderIdNum,
              callSid,
              outcome: 'escalated_to_backup',
              transcript: `Escalating to backup contact after ${outcome}`
            }
          })
        } else {
          await prisma.reminder.update({
            where: { id: reminderIdNum },
            data: {
              status: Status.DONE,
              attempts: newAttempts,
              lastOutcome: `Max primary attempts reached - ${outcome}, no backup available`
            }
          })
          
          await prisma.callLog.create({
            data: {
              reminderId: reminderIdNum,
              callSid,
              outcome: 'max_attempts_primary',
              transcript: `Final attempt failed: ${outcome}`
            }
          })
        }
      } else {
        const nextAttempt = new Date(Date.now() + RETRY_DELAY_MS)
        
        await prisma.reminder.update({
          where: { id: reminderIdNum },
          data: {
            status: Status.RETRYING,
            attempts: newAttempts,
            nextAttemptAt: nextAttempt,
            lastOutcome: `Primary attempt ${newAttempts} failed (${outcome}), retrying`
          }
        })
        
        await prisma.callLog.create({
          data: {
            reminderId: reminderIdNum,
            callSid,
            outcome: 'retry_primary_scheduled',
            transcript: `Primary retry scheduled for ${nextAttempt.toISOString()}`
          }
        })
      }
    }
    
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Error in call-status endpoint:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}