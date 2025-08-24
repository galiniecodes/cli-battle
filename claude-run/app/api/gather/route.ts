import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createVoiceResponse, parseGatherInput } from '@/lib/twilio'
import { Status } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const searchParams = request.nextUrl.searchParams
    
    const reminderId = searchParams.get('reminderId')
    const speechResult = formData.get('SpeechResult') as string || ''
    const digits = formData.get('Digits') as string || ''
    const callSid = formData.get('CallSid') as string || ''
    
    const input = speechResult || digits
    const response = createVoiceResponse()
    
    if (!reminderId || !input) {
      response.say(
        { voice: 'alice' },
        'Sorry, we could not process your response. Goodbye.'
      )
      response.hangup()
      return new NextResponse(response.toString(), {
        status: 200,
        headers: { 'Content-Type': 'text/xml' }
      })
    }
    
    const reminderIdNum = parseInt(reminderId, 10)
    const { action, rawInput } = parseGatherInput(input)
    
    await prisma.callLog.create({
      data: {
        reminderId: reminderIdNum,
        callSid,
        outcome: 'gather_received',
        transcript: rawInput,
        intent: action
      }
    })
    
    switch (action) {
      case 'confirm':
        await prisma.reminder.update({
          where: { id: reminderIdNum },
          data: {
            status: Status.DONE,
            lastOutcome: 'Confirmed by user'
          }
        })
        
        await prisma.callLog.create({
          data: {
            reminderId: reminderIdNum,
            callSid,
            outcome: 'completed',
            transcript: 'User confirmed reminder',
            intent: 'confirmed'
          }
        })
        
        response.say(
          { voice: 'alice' },
          'Thank you! Your reminder has been acknowledged. Have a great day!'
        )
        response.hangup()
        break
        
      case 'snooze':
        const nextAttempt = new Date(Date.now() + 60 * 60 * 1000) // +1 hour
        
        await prisma.reminder.update({
          where: { id: reminderIdNum },
          data: {
            status: Status.SCHEDULED,
            nextAttemptAt: nextAttempt,
            lastOutcome: 'Snoozed by user for 1 hour',
            attempts: 0,
            backupAttempts: 0
          }
        })
        
        await prisma.callLog.create({
          data: {
            reminderId: reminderIdNum,
            callSid,
            outcome: 'snoozed',
            transcript: `Reminder snoozed until ${nextAttempt.toISOString()}`,
            intent: 'snoozed'
          }
        })
        
        response.say(
          { voice: 'alice' },
          'Understood! I will call you back in one hour. Goodbye!'
        )
        response.hangup()
        break
        
      case 'unknown':
      default:
        response.say(
          { voice: 'alice' },
          'Sorry, I did not understand your response. Please try again. Say confirm or press 1 to acknowledge, or say snooze or press 2 to reschedule.'
        )
        
        const gather = response.gather({
          input: ['speech', 'dtmf'],
          action: `/api/gather?reminderId=${reminderId}`,
          method: 'POST',
          timeout: 5,
          numDigits: 1,
          speechTimeout: 'auto',
          hints: 'confirm, snooze, yes, later, acknowledge'
        })
        
        gather.say(
          { voice: 'alice' },
          'Waiting for your response.'
        )
        
        response.say(
          { voice: 'alice' },
          'We did not receive your response. Goodbye.'
        )
        break
    }
    
    return new NextResponse(response.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    })
  } catch (error) {
    console.error('Error in gather endpoint:', error)
    
    const errorResponse = createVoiceResponse()
    errorResponse.say('Sorry, there was an error processing your response. Goodbye.')
    errorResponse.hangup()
    
    return new NextResponse(errorResponse.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    })
  }
}