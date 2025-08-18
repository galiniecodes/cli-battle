import { NextRequest, NextResponse } from 'next/server'
import { createVoiceResponse, getWebhookUrl } from '@/lib/twilio'

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const reminderId = searchParams.get('reminderId')
    const title = searchParams.get('title') || 'your reminder'
    
    const response = createVoiceResponse()
    
    response.say(
      {
        voice: 'alice'
      },
      `Hello! This is a reminder about: ${title}.`
    )
    
    const gather = response.gather({
      input: ['speech', 'dtmf'],
      action: getWebhookUrl(`/api/gather?reminderId=${reminderId}`),
      method: 'POST',
      timeout: 5,
      numDigits: 1,
      speechTimeout: 'auto',
      hints: 'confirm, snooze, yes, later, acknowledge'
    })
    
    gather.say(
      {
        voice: 'alice'
      },
      'Please say confirm or press 1 to acknowledge this reminder. Say snooze or press 2 to reschedule for one hour from now.'
    )
    
    response.say(
      {
        voice: 'alice'
      },
      'We did not receive your response. Goodbye.'
    )
    
    return new NextResponse(response.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    })
  } catch (error) {
    console.error('Error in voice endpoint:', error)
    
    const errorResponse = createVoiceResponse()
    errorResponse.say('Sorry, there was an error processing your reminder. Please try again later.')
    errorResponse.hangup()
    
    return new NextResponse(errorResponse.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml'
      }
    })
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}