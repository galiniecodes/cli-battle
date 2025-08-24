import { NextResponse } from 'next/server'
import { shortId } from '@/lib/log'

// Twilio initial TwiML: simple prompt placeholder
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const target = searchParams.get('target') || 'primary'
  const rid = searchParams.get('rid') || ''
  if (rid) console.log(`[voice:answer] rid=${shortId(rid)} target=${target}`)
  const base = (process.env.APP_BASE_URL || '').replace(/\/$/, '')
  const gatherActionRaw = `${base}/api/voice/gather?target=${encodeURIComponent(target)}&rid=${encodeURIComponent(rid)}`
  // Escape & to &amp; for XML attribute safety
  const gatherAction = gatherActionRaw.replace(/&/g, '&amp;')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">This is your scheduled reminder.</Say>
  <Pause length="1"/>
  <Say voice="alice">Press one to confirm, or ignore to end.</Say>
  <Gather numDigits="1" action="${gatherAction}" method="POST" timeout="5"></Gather>
  <Say voice="alice">No input received. Goodbye.</Say>
  <Hangup/>
</Response>`
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } })
}

export const GET = POST
