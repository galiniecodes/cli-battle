import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Status } from '@prisma/client'

const MAX_PRIMARY_ATTEMPTS = 1
const MAX_BACKUP_ATTEMPTS = 1
const RETRY_DELAY_MS = 60000 // 1 minute

export async function POST() {
  try {
    const now = new Date()
    
    // Processing summary counters
    let processed = 0
    let successfullyCalled = 0
    let scheduledForRetry = 0
    let escalatedToBackup = 0
    let markedAsDone = 0
    
    // Find all due reminders with appropriate statuses
    const dueReminders = await prisma.reminder.findMany({
      where: {
        status: {
          in: [Status.SCHEDULED, Status.RETRYING, Status.ESCALATED]
        },
        nextAttemptAt: {
          lte: now
        }
      },
      orderBy: {
        nextAttemptAt: 'asc'
      }
    })
    
    console.log(`Found ${dueReminders.length} due reminders to process`)
    
    // Process each reminder atomically
    for (const reminder of dueReminders) {
      try {
        // Use transaction to atomically update reminder and prevent race conditions
        const result = await prisma.$transaction(async (tx) => {
          // Re-fetch with lock to ensure we have latest state
          const lockedReminder = await tx.reminder.findUnique({
            where: { id: reminder.id }
          })
          
          // Skip if already being processed or status changed
          if (!lockedReminder || 
              lockedReminder.status === Status.CALLING || 
              lockedReminder.status === Status.DONE ||
              lockedReminder.nextAttemptAt > now) {
            console.log(`Skipping reminder ${reminder.id} - already processed or not due`)
            return null
          }
          
          // Update to CALLING status
          await tx.reminder.update({
            where: { id: reminder.id },
            data: {
              status: Status.CALLING,
              lastOutcome: 'Initiating call'
            }
          })
          
          // Determine which phone to call
          const isBackupCall = lockedReminder.status === Status.ESCALATED
          const phoneToCall = isBackupCall ? lockedReminder.backupPhone : lockedReminder.primaryPhone
          
          // Create call log entry with mock call_sid
          const callSid = `MOCK_${Date.now()}_${reminder.id}`
          await tx.callLog.create({
            data: {
              reminderId: reminder.id,
              callSid,
              outcome: 'initiated',
              transcript: `Mock call to ${phoneToCall} for: ${lockedReminder.title}`
            }
          })
          
          console.log(`Processing reminder ${reminder.id}: ${lockedReminder.title}`)
          console.log(`  Calling ${isBackupCall ? 'backup' : 'primary'} phone: ${phoneToCall}`)
          console.log(`  Call SID: ${callSid}`)
          
          // Simulate call outcome (70% success, 30% failure for testing)
          const callSucceeded = Math.random() > 0.3
          
          if (callSucceeded) {
            // Call succeeded - mark as done
            await tx.reminder.update({
              where: { id: reminder.id },
              data: {
                status: Status.DONE,
                lastOutcome: 'Call completed successfully'
              }
            })
            
            await tx.callLog.create({
              data: {
                reminderId: reminder.id,
                callSid: `${callSid}_outcome`,
                outcome: 'completed',
                transcript: 'Reminder acknowledged',
                intent: 'confirmed'
              }
            })
            
            successfullyCalled++
            console.log(`  ✓ Call succeeded`)
            
          } else {
            // Call failed - determine next action
            console.log(`  ✗ Call failed`)
            
            if (isBackupCall) {
              // This was a backup call
              const newBackupAttempts = lockedReminder.backupAttempts + 1
              
              if (newBackupAttempts >= MAX_BACKUP_ATTEMPTS) {
                // Max backup attempts reached - mark as done
                await tx.reminder.update({
                  where: { id: reminder.id },
                  data: {
                    status: Status.DONE,
                    backupAttempts: newBackupAttempts,
                    lastOutcome: `Max backup attempts (${MAX_BACKUP_ATTEMPTS}) reached`
                  }
                })
                
                await tx.callLog.create({
                  data: {
                    reminderId: reminder.id,
                    callSid: `${callSid}_outcome`,
                    outcome: 'max_attempts_backup',
                    transcript: 'No answer - max backup attempts reached'
                  }
                })
                
                markedAsDone++
                console.log(`  Max backup attempts reached - marking as DONE`)
                
              } else {
                // Schedule backup retry
                const nextAttempt = new Date(Date.now() + RETRY_DELAY_MS)
                
                await tx.reminder.update({
                  where: { id: reminder.id },
                  data: {
                    status: Status.ESCALATED,
                    backupAttempts: newBackupAttempts,
                    nextAttemptAt: nextAttempt,
                    lastOutcome: `Backup attempt ${newBackupAttempts} failed, retrying`
                  }
                })
                
                await tx.callLog.create({
                  data: {
                    reminderId: reminder.id,
                    callSid: `${callSid}_outcome`,
                    outcome: 'no_answer_backup',
                    transcript: `Backup attempt ${newBackupAttempts} - no answer`
                  }
                })
                
                scheduledForRetry++
                console.log(`  Backup retry scheduled for ${nextAttempt.toISOString()}`)
              }
              
            } else {
              // This was a primary call
              const newAttempts = lockedReminder.attempts + 1
              
              if (newAttempts >= MAX_PRIMARY_ATTEMPTS) {
                // Max primary attempts reached
                if (lockedReminder.backupPhone) {
                  // Has backup phone - escalate
                  const nextAttempt = new Date(Date.now() + RETRY_DELAY_MS)
                  
                  await tx.reminder.update({
                    where: { id: reminder.id },
                    data: {
                      status: Status.ESCALATED,
                      attempts: newAttempts,
                      nextAttemptAt: nextAttempt,
                      lastOutcome: `Primary max attempts (${MAX_PRIMARY_ATTEMPTS}) reached, escalating to backup`
                    }
                  })
                  
                  await tx.callLog.create({
                    data: {
                      reminderId: reminder.id,
                      callSid: `${callSid}_outcome`,
                      outcome: 'escalated',
                      transcript: 'No answer - escalating to backup contact'
                    }
                  })
                  
                  escalatedToBackup++
                  console.log(`  Escalating to backup phone: ${lockedReminder.backupPhone}`)
                  
                } else {
                  // No backup phone - mark as done
                  await tx.reminder.update({
                    where: { id: reminder.id },
                    data: {
                      status: Status.DONE,
                      attempts: newAttempts,
                      lastOutcome: `Max primary attempts (${MAX_PRIMARY_ATTEMPTS}) reached, no backup available`
                    }
                  })
                  
                  await tx.callLog.create({
                    data: {
                      reminderId: reminder.id,
                      callSid: `${callSid}_outcome`,
                      outcome: 'max_attempts_primary',
                      transcript: 'No answer - max attempts reached'
                    }
                  })
                  
                  markedAsDone++
                  console.log(`  Max primary attempts reached, no backup - marking as DONE`)
                }
                
              } else {
                // Schedule primary retry
                const nextAttempt = new Date(Date.now() + RETRY_DELAY_MS)
                
                await tx.reminder.update({
                  where: { id: reminder.id },
                  data: {
                    status: Status.RETRYING,
                    attempts: newAttempts,
                    nextAttemptAt: nextAttempt,
                    lastOutcome: `Primary attempt ${newAttempts} failed, retrying`
                  }
                })
                
                await tx.callLog.create({
                  data: {
                    reminderId: reminder.id,
                    callSid: `${callSid}_outcome`,
                    outcome: 'no_answer_primary',
                    transcript: `Primary attempt ${newAttempts} - no answer`
                  }
                })
                
                scheduledForRetry++
                console.log(`  Primary retry scheduled for ${nextAttempt.toISOString()}`)
              }
            }
          }
          
          return true
        })
        
        if (result) {
          processed++
        }
        
      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error)
        // Continue processing other reminders
      }
    }
    
    const summary = {
      success: true,
      processed,
      successfullyCalled,
      scheduledForRetry,
      escalatedToBackup,
      markedAsDone,
      message: `Processed ${processed} reminder(s): ${successfullyCalled} successful, ${scheduledForRetry} retrying, ${escalatedToBackup} escalated, ${markedAsDone} completed`
    }
    
    console.log('Processing summary:', summary)
    return NextResponse.json(summary)
    
  } catch (error) {
    console.error('Error in scheduler tick:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}