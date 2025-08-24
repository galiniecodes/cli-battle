import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

let twilioClient: twilio.Twilio | null = null

export function getTwilioClient() {
  if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured')
    return null
  }
  
  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken)
  }
  
  return twilioClient
}

export function getWebhookUrl(path: string): string {
  if (process.env.APP_BASE_URL) {
    return `${process.env.APP_BASE_URL}${path}`
  }
  
  // In development, detect the actual port being used
  const port = process.env.PORT || '3003'
  return `http://localhost:${port}${path}`
}

export async function makeCall(
  to: string,
  reminderId: number,
  reminderTitle: string
): Promise<{ success: boolean; callSid?: string; error?: string }> {
  const client = getTwilioClient()
  
  if (!client || !twilioPhoneNumber) {
    console.error('Twilio not configured properly')
    return { 
      success: false, 
      error: 'Twilio not configured' 
    }
  }
  
  try {
    const call = await client.calls.create({
      to,
      from: twilioPhoneNumber,
      url: getWebhookUrl(`/api/voice?reminderId=${reminderId}&title=${encodeURIComponent(reminderTitle)}`),
      statusCallback: getWebhookUrl(`/api/call-status?reminderId=${reminderId}`),
      statusCallbackEvent: ['initiated', 'answered', 'completed', 'no-answer', 'busy', 'failed'],
      method: 'POST',
      timeout: 30,
      record: false
    })
    
    return { 
      success: true, 
      callSid: call.sid 
    }
  } catch (error) {
    console.error('Error making Twilio call:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export function createVoiceResponse() {
  return new twilio.twiml.VoiceResponse()
}

export function validateTwilioRequest(
  authToken: string,
  twilioSignature: string,
  url: string,
  params: any
): boolean {
  if (process.env.NODE_ENV === 'development') {
    console.log('Skipping Twilio signature validation in development')
    return true
  }
  
  return twilio.validateRequest(
    authToken,
    twilioSignature,
    url,
    params
  )
}

export function parseCallOutcome(status: string): {
  shouldRetry: boolean
  isSuccess: boolean
  outcome: string
  isIntermediate: boolean
} {
  switch (status.toLowerCase()) {
    case 'completed':
      return { shouldRetry: false, isSuccess: true, outcome: 'completed', isIntermediate: false }
    case 'answered':
      return { shouldRetry: false, isSuccess: true, outcome: 'answered', isIntermediate: false }
    case 'no-answer':
      return { shouldRetry: true, isSuccess: false, outcome: 'no_answer', isIntermediate: false }
    case 'busy':
      return { shouldRetry: true, isSuccess: false, outcome: 'busy', isIntermediate: false }
    case 'failed':
      return { shouldRetry: true, isSuccess: false, outcome: 'failed', isIntermediate: false }
    case 'canceled':
      return { shouldRetry: false, isSuccess: false, outcome: 'canceled', isIntermediate: false }
    case 'initiated':
    case 'queued':
    case 'ringing':
    case 'in-progress':
      return { shouldRetry: false, isSuccess: false, outcome: status, isIntermediate: true }
    default:
      return { shouldRetry: false, isSuccess: false, outcome: status, isIntermediate: false }
  }
}

export function parseGatherInput(input: string): {
  action: 'confirm' | 'snooze' | 'unknown'
  rawInput: string
} {
  const normalized = input.toLowerCase().trim()
  
  if (normalized === '1' || normalized.includes('confirm') || normalized.includes('yes') || normalized.includes('acknowledge')) {
    return { action: 'confirm', rawInput: input }
  }
  
  if (normalized === '2' || normalized.includes('snooze') || normalized.includes('later') || normalized.includes('hour')) {
    return { action: 'snooze', rawInput: input }
  }
  
  return { action: 'unknown', rawInput: input }
}