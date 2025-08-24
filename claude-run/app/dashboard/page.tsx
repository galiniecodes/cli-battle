'use client'

import { useState } from 'react'
import ReminderForm from '@/app/components/ReminderForm'
import RemindersTable from '@/app/components/RemindersTable'

export default function Dashboard() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleReminderCreated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Phone Reminder Dashboard</h1>
          <p className="mt-2 text-gray-600">Schedule and manage automated phone call reminders</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <ReminderForm onSuccess={handleReminderCreated} />
          </div>
          
          <div className="lg:col-span-2">
            <RemindersTable refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </div>
  )
}