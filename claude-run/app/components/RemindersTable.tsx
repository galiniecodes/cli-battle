'use client'

import { useState, useEffect } from 'react'
import StatusBadge from './StatusBadge'
import { formatPhoneDisplay } from '@/lib/phone-utils'
import { Status } from '@prisma/client'

interface CallLog {
  id: number
  reminderId: number
  callSid: string | null
  outcome: string | null
  transcript: string | null
  intent: string | null
  createdAt: string
}

interface Reminder {
  id: number
  title: string
  primaryPhone: string
  backupPhone: string | null
  scheduledAt: string
  nextAttemptAt: string
  attempts: number
  backupAttempts: number
  status: Status
  createdAt: string
  lastOutcome: string | null
  callLogs: CallLog[]
}

interface RemindersTableProps {
  refreshTrigger: number
}

export default function RemindersTable({ refreshTrigger }: RemindersTableProps) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [callingId, setCallingId] = useState<number | null>(null)

  const fetchReminders = async () => {
    try {
      const response = await fetch('/api/reminders')
      if (!response.ok) {
        throw new Error('Failed to fetch reminders')
      }
      const data = await response.json()
      setReminders(data)
      setError(null)
    } catch (err) {
      setError('Failed to load reminders')
      console.error('Error fetching reminders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReminders()
  }, [refreshTrigger])

  useEffect(() => {
    const interval = setInterval(fetchReminders, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleCallNow = async (reminderId: number) => {
    setCallingId(reminderId)
    try {
      const response = await fetch('/api/call-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reminderId })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to initiate call')
        return
      }

      await fetchReminders()
    } catch (error) {
      alert('An error occurred. Please try again.')
      console.error('Error calling now:', error)
    } finally {
      setCallingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && reminders.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-500 text-center">Loading reminders...</p>
      </div>
    )
  }

  if (error && reminders.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-red-600 text-center">{error}</p>
      </div>
    )
  }

  if (reminders.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Reminders</h2>
        <p className="text-gray-600 text-center">No reminders yet. Create your first reminder above.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Reminders</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attempts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Next Attempt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Outcome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reminders.map((reminder) => (
              <tr key={reminder.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{reminder.title}</div>
                    <div className="text-xs text-gray-500">
                      {formatPhoneDisplay(reminder.primaryPhone)}
                      {reminder.backupPhone && (
                        <span className="ml-2">
                          / {formatPhoneDisplay(reminder.backupPhone)}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={reminder.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {reminder.attempts}
                  {reminder.backupAttempts > 0 && (
                    <span className="text-gray-500"> / {reminder.backupAttempts}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {reminder.nextAttemptAt ? formatDate(reminder.nextAttemptAt) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {reminder.lastOutcome || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(reminder.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleCallNow(reminder.id)}
                    disabled={callingId === reminder.id || reminder.status === 'CALLING'}
                    className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                      callingId === reminder.id || reminder.status === 'CALLING'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {callingId === reminder.id ? 'Calling...' : 'Call Now'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}