import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { shortId, truncate } from '@/lib/log'

function norm(text: string | null | undefined) {
  return (text || '').toString().trim().toLowerCase()
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const target = (searchParams.get('target') || 'primary') as 'primary' | 'backup'
    const form = await request.formData().catch(() => null)
    const rid = (form?.get('rid') as string) || searchParams.get('rid') || ''
    const digits = norm(form?.get('Digits') as string)
    const speech = norm(form?.get('SpeechResult') as string)
    const callSid = (form?.get('CallSid') as string) || ''

    const transcriptRaw = digits || speech || ''
    const transcript = truncate(transcriptRaw, 500)

    if (rid) console.log(`[gather] rid=${shortId(rid)} target=${target} digits=${digits || 'none'} speech=${speech || 'none'} sid=${shortId(callSid)}`)

    let intent: 'confirm' | 'snooze' | 'unknown' = 'unknown'
    if (digits === '1' || speech.includes('confirm') || speech === 'yes') {
      intent = 'confirm'
    } else if (digits === '2' || speech.includes('snooze') || speech.includes('call me in an hour')) {
      intent = 'snooze'
    }

    // Log gather with transcript and intent
    if (rid && callSid) {
      await prisma.callLog.create({
        data: {
          reminder_id: rid,
          call_sid: callSid,
          outcome: 'gather',
          transcript,
          intent,
        },
      }).catch(() => {})
    }

    if (rid) {
      if (intent === 'confirm') {
        await prisma.reminder.update({
          where: { id: rid },
          data: { status: 'DONE', last_outcome: `Confirmed via IVR (${target})`, next_attempt_at: null },
        }).catch(() => {})
      } else if (intent === 'snooze') {
        await prisma.reminder.update({
          where: { id: rid },
          data: { status: 'RETRYING', next_attempt_at: new Date(Date.now() + 60 * 60 * 1000), last_outcome: 'Snoozed 60 minutes' },
        }).catch(() => {})
      } else {
        // Unknown: do not change status, only log
      }
    }

    const say =
      intent === 'confirm'
        ? 'Acknowledged. Have a great day. Goodbye.'
        : intent === 'snooze'
        ? 'Okay, we will remind you again in one hour. Goodbye.'
        : 'Sorry, I did not understand. Goodbye.'

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Say voice="alice">${say}</Say>\n  <Hangup/>\n</Response>`
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } })
  } catch (err) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>', {
      headers: { 'Content-Type': 'application/xml' },
    })
  }
}

export const GET = POST

