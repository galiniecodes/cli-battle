import { prisma } from '@/lib/prisma'
import { Status } from '@prisma/client'
import { initiateTwilioCall } from '@/lib/twilio'
import { shortId, maskPhone } from '@/lib/log'

type DialTarget = 'primary' | 'backup'

function pickTarget(reminder: {
  status: Status
  attempts: number
  backup_attempts: number
  backup_phone: string | null
}): DialTarget | null {
  // If escalated and backup exists and not yet attempted
  if (reminder.status === 'ESCALATED' && reminder.backup_phone) {
    if (reminder.backup_attempts < 1) return 'backup'
    return null
  }
  // Otherwise, try primary if not yet attempted
  if (reminder.attempts < 1) return 'primary'
  return null
}

export type TickSummary = {
  due_found: number
  reserved: number
  calls_initiated: number
  skipped: number
  errors: number
}

export async function runSchedulerTick(limit = 10): Promise<TickSummary> {
  const now = new Date()
  const due = await prisma.reminder.findMany({
    where: {
      next_attempt_at: { lte: now },
      status: { in: ['SCHEDULED', 'RETRYING', 'ESCALATED'] },
    },
    orderBy: { next_attempt_at: 'asc' },
    take: limit,
  })

  if (due.length === 0) return { due_found: 0, reserved: 0, calls_initiated: 0, skipped: 0, errors: 0 }

  // Decide target per reminder up-front
  const plan = due.map((r) => ({ r, target: pickTarget(r) }))
  const candidates = plan.filter((p) => p.target !== null) as Array<{ r: typeof due[number]; target: DialTarget }>

  if (candidates.length === 0) {
    // Auto-advance items that are due but have no remaining attempts
    let updates = 0
    await prisma.$transaction(async (tx) => {
      for (const r of due) {
        if (r.status === 'ESCALATED') {
          if (r.backup_attempts >= 1) {
            await tx.reminder.update({
              where: { id: r.id },
              data: { status: 'DONE', next_attempt_at: null, last_outcome: 'Backup attempts exhausted' },
            })
            updates++
            console.log(`[scheduler] finalize rid=${shortId(r.id)} -> DONE (backup exhausted)`)          
          }
        } else {
          if (r.attempts >= 1) {
            if (r.backup_phone) {
              await tx.reminder.update({
                where: { id: r.id },
                data: { status: 'ESCALATED', next_attempt_at: new Date(), last_outcome: 'Escalating to backup' },
              })
              updates++
              console.log(`[scheduler] advance rid=${shortId(r.id)} -> ESCALATED (primary exhausted)`)          
            } else {
              await tx.reminder.update({
                where: { id: r.id },
                data: { status: 'DONE', next_attempt_at: null, last_outcome: 'Primary attempts exhausted' },
              })
              updates++
              console.log(`[scheduler] finalize rid=${shortId(r.id)} -> DONE (no backup)`)          
            }
          }
        }
      }
    })
    return { due_found: due.length, reserved: 0, calls_initiated: 0, skipped: due.length, errors: 0 }
  }

  console.log(`[scheduler] due_found=${due.length} candidates=${candidates.length}`)

  // Atomically reserve by moving to CALLING and incrementing the relevant counter
  const reserved: Array<{ id: string; target: DialTarget }> = []
  await prisma.$transaction(async (tx) => {
    for (const { r, target } of candidates) {
      try {
        const count = await tx.reminder.updateMany({
          where: {
            id: r.id,
            next_attempt_at: { lte: now },
            status: { in: ['SCHEDULED', 'RETRYING', 'ESCALATED'] },
            ...(target === 'primary'
              ? { attempts: { lt: 1 } }
              : { backup_attempts: { lt: 1 }, backup_phone: { not: null } }),
          },
          data: target === 'primary'
            ? {
                status: 'CALLING',
                attempts: { increment: 1 },
                last_outcome: 'Calling primary',
                next_attempt_at: null,
              }
            : {
                status: 'CALLING',
                backup_attempts: { increment: 1 },
                last_outcome: 'Calling backup',
                next_attempt_at: null,
              },
        })
        if (count.count === 1) {
          reserved.push({ id: r.id, target })
          console.log(`[scheduler] reserved rid=${shortId(r.id)} target=${target}`)
        } else {
          console.log(`[scheduler] skip rid=${shortId(r.id)} target=${target} (race or limit reached)`)
        }
      } catch {
        // Ignore P2025 or any race — not reserved
      }
    }
  })

  let calls_initiated = 0
  let errors = 0
  for (const res of reserved) {
    try {
      const reminder = await prisma.reminder.findUnique({ where: { id: res.id } })
      if (!reminder) continue

      const to = res.target === 'primary' ? reminder.primary_phone : reminder.backup_phone
      if (!to) {
        // No destination — mark done with outcome
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'DONE', last_outcome: 'No destination number to call' },
        })
        continue
      }
      console.log(`[scheduler] initiating rid=${shortId(reminder.id)} target=${res.target} to=${maskPhone(to)}`)
      const call = await initiateTwilioCall({
        reminderId: reminder.id,
        to,
        target: res.target,
        title: reminder.title,
      })

      // Log initiation
      await prisma.callLog.create({
        data: {
          reminder_id: reminder.id,
          call_sid: call.sid,
          outcome: `initiated:${res.target}`,
        },
      })

      calls_initiated += 1
    } catch (e: any) {
      errors += 1
      // If initiation fails, treat as a failed attempt and progress state
      // Primary failure => escalate if backup exists, else done
      const reminder = await prisma.reminder.findUnique({ where: { id: res.id } })
      if (!reminder) continue

      console.error(`[scheduler] initiate error rid=${shortId(res.id)} target=${res.target} msg=${(e && e.message) || e}`)
      const sid = `init-failed-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
      await prisma.callLog.create({
        data: {
          reminder_id: reminder.id,
          call_sid: sid,
          outcome: `initiation-error:${res.target}`,
        },
      })

      if (res.target === 'primary') {
        const hasBackup = !!reminder.backup_phone
        if (hasBackup) {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              status: 'ESCALATED',
              next_attempt_at: new Date(Date.now() + 60_000),
              last_outcome: `Primary initiation failed; escalating to backup (${String((e && e.message) || e).slice(0, 120)})`,
            },
          })
        } else {
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: 'DONE', last_outcome: `Primary initiation failed; no backup (${String((e && e.message) || e).slice(0, 120)})` },
          })
        }
      } else {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'DONE', last_outcome: `Backup initiation failed (${String((e && e.message) || e).slice(0, 120)})` },
        })
      }
    }
  }

  return {
    due_found: due.length,
    reserved: reserved.length,
    calls_initiated,
    skipped: due.length - reserved.length,
    errors,
  }
}

// Back-compat for M2 call-now usage
export async function processDueReminders(limit = 10) {
  const summary = await runSchedulerTick(limit)
  return summary.reserved
}
