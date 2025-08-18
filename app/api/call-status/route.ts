import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { shortId } from '@/lib/log'

// Twilio will POST status updates here (x-www-form-urlencoded)
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const target = (searchParams.get('target') || 'primary') as 'primary' | 'backup'
    const rid = searchParams.get('rid') || ''
    const form = await request.formData().catch(() => null)
    const callSid = (form?.get('CallSid') as string) || ''
    const callStatus = ((form?.get('CallStatus') as string) || '').toLowerCase()

    if (!rid) return NextResponse.json({ ok: false, error: 'Missing rid' }, { status: 400 })
    const reminder = await prisma.reminder.findUnique({ where: { id: rid } })
    if (!reminder) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

    console.log(`[status] rid=${shortId(rid)} target=${target} status=${callStatus || 'unknown'} sid=${shortId(callSid)}`)

    // Log status
    if (callSid) {
      await prisma.callLog.create({
        data: {
          reminder_id: reminder.id,
          call_sid: callSid,
          outcome: `status:${callStatus || 'unknown'}:${target}`,
        },
      }).catch(() => {})
    }

    // Handle outcomes
    if (callStatus === 'completed') {
      // If confirmed via gather for this callSid, set DONE. Otherwise treat as miss.
      const gather = callSid
        ? await prisma.callLog.findFirst({ where: { reminder_id: reminder.id, call_sid: callSid, intent: 'confirm' } })
        : null
      if (gather) {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'DONE', last_outcome: `Confirmed via IVR (${target})`, next_attempt_at: null },
        })
      } else {
        // Treat as not confirmed; schedule retry/escalation per target
        if (target === 'primary') {
          if (reminder.backup_phone) {
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: {
                status: 'ESCALATED',
                next_attempt_at: new Date(Date.now() + 60_000),
                last_outcome: 'Primary completed without confirm; escalating',
              },
            })
          } else {
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { status: 'DONE', last_outcome: 'Primary completed without confirm; no backup', next_attempt_at: null },
            })
          }
        } else {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: 'DONE', last_outcome: 'Backup completed without confirm', next_attempt_at: null },
          })
        }
      }
    } else if (['no-answer', 'busy', 'failed', 'canceled'].includes(callStatus)) {
      if (target === 'primary') {
        if (reminder.backup_phone) {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              status: 'ESCALATED',
              next_attempt_at: new Date(Date.now() + 60_000),
              last_outcome: `Primary ${callStatus}; escalating`,
            },
          })
        } else {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: 'DONE', last_outcome: `Primary ${callStatus}; no backup`, next_attempt_at: null },
          })
        }
      } else {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'DONE', last_outcome: `Backup ${callStatus}`, next_attempt_at: null },
        })
      }
    } else {
      // Other states: keep status, just note outcome
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { last_outcome: `Call ${callStatus || 'updated'} (${target})` },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/call-status error', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

export const GET = POST

