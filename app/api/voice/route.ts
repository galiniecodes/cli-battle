import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { shortId } from '@/lib/log'

// Returns TwiML with greeting and <Gather> supporting speech + DTMF
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const rid = searchParams.get('rid') || ''
  const target = (searchParams.get('target') || 'primary') as 'primary' | 'backup'

  let title = 'your reminder'
  if (rid) {
    try {
      const r = await prisma.reminder.findUnique({ where: { id: rid } })
      if (r?.title) title = r.title
    } catch {
      // ignore db errors here; fallback title
    }
    console.log(`[voice] answer rid=${shortId(rid)} target=${target}`)
  }

  const base = (process.env.APP_BASE_URL || '').replace(/\/$/, '')
  const gatherActionRaw = `${base}/api/gather?target=${encodeURIComponent(target)}&rid=${encodeURIComponent(rid)}`
  const gatherAction = gatherActionRaw.replace(/&/g, '&amp;')

  const prompt = 'Say confirm or press 1 to acknowledge, say snooze or press 2 to reschedule.'

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">This is your scheduled reminder: ${escapeForXml(title)}.</Say>
  <Pause length="1"/>
  <Say voice="alice">${prompt}</Say>
  <Gather input="speech dtmf" language="en-US" numDigits="1" action="${gatherAction}" method="POST" timeout="6" speechTimeout="auto"></Gather>
  <Say voice="alice">No input received. Goodbye.</Say>
  <Hangup/>
</Response>`

  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } })
}

export const GET = POST

function escapeForXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

