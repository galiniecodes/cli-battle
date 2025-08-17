// Simple seed script to insert a couple of reminders
// Usage: npx prisma db seed  (or npm run db:seed)
const { PrismaClient, Status } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const now = new Date()
  const inFive = new Date(now.getTime() + 5 * 60 * 1000)
  const inTen = new Date(now.getTime() + 10 * 60 * 1000)

  await prisma.reminder.createMany({
    data: [
      {
        title: 'Demo: Take medication',
        primary_phone: '+15550001111',
        backup_phone: '+15550002222',
        scheduled_at: inFive,
        next_attempt_at: inFive,
        attempts: 0,
        backup_attempts: 0,
        status: Status.SCHEDULED,
      },
      {
        title: 'Demo: Dentist appointment',
        primary_phone: '+15550003333',
        backup_phone: null,
        scheduled_at: inTen,
        next_attempt_at: inTen,
        attempts: 0,
        backup_attempts: 0,
        status: Status.SCHEDULED,
      },
    ],
    skipDuplicates: true,
  })

  const count = await prisma.reminder.count()
  console.log(`Seeded reminders. Total reminders: ${count}`)
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

