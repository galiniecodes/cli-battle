import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { shortId } from '@/lib/log'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const target = (searchParams.get('target') || 'primary') as 'primary' | 'backup'
    const form = await request.formData().catch(() => null)
    const rid = (form?.get('rid') as string) || searchParams.get('rid') || ''
    const digits = (form?.get('Digits') as string) || ''
    if (rid) console.log(`[voice:gather] rid=${shortId(rid)} target=${target} digits=${digits || 'none'}`)

    // Optional: If we received a reminder id, update based on input
    if (rid) {
      if (digits === '1') {
        await prisma.reminder.update({
          where: { id: rid },
          data: { status: 'DONE', last_outcome: `Confirmed via IVR (${target})` },
        }).catch(() => {})
      } else if (digits === '9') {
        await prisma.reminder.update({
          where: { id: rid },
          data: { status: 'RETRYING', next_attempt_at: new Date(Date.now() + 60_000), last_outcome: 'Snoozed 1 minute' },
        }).catch(() => {})
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you. Goodbye.</Say>
  <Hangup/>
</Response>`
    return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml' } })
  } catch (err) {
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>', {
      headers: { 'Content-Type': 'application/xml' },
    })
  }
}

export const GET = POST
