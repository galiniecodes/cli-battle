import { prisma } from '@/lib/prisma'

export async function processDueReminders(limit = 10) {
  const now = new Date()
  const due = await prisma.reminder.findMany({
    where: {
      next_attempt_at: { lte: now },
      status: { in: ['SCHEDULED', 'RETRYING'] },
    },
    orderBy: { next_attempt_at: 'asc' },
    take: limit,
  })

  if (due.length === 0) return 0

  await prisma.$transaction(
    due.map((r) =>
      prisma.reminder.update({
        where: { id: r.id },
        data: {
          status: 'CALLING',
          attempts: r.attempts + 1,
          last_outcome: 'Call initiated',
          next_attempt_at: null,
        },
      }),
    ),
  )

  return due.length
}

