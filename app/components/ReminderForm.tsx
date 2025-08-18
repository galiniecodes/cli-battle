'use client'

import { useState } from 'react'
import { validateE164Phone } from '@/lib/phone-utils'

interface ReminderFormProps {
  onSuccess: () => void
}

export default function ReminderForm({ onSuccess }: ReminderFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    primaryPhone: '',
    backupPhone: '',
    scheduledAt: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.primaryPhone.trim()) {
      newErrors.primaryPhone = 'Primary phone is required'
    } else if (!validateE164Phone(formData.primaryPhone)) {
      newErrors.primaryPhone = 'Phone must be in E.164 format (e.g., +12125551234)'
    }

    if (formData.backupPhone && !validateE164Phone(formData.backupPhone)) {
      newErrors.backupPhone = 'Phone must be in E.164 format (e.g., +12125551234)'
    }

    if (!formData.scheduledAt) {
      newErrors.scheduledAt = 'Scheduled time is required'
    } else {
      const scheduledDate = new Date(formData.scheduledAt)
      if (isNaN(scheduledDate.getTime())) {
        newErrors.scheduledAt = 'Invalid date format'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        setErrors({ submit: data.error || 'Failed to create reminder' })
        return
      }

      setFormData({
        title: '',
        primaryPhone: '',
        backupPhone: '',
        scheduledAt: ''
      })
      onSuccess()
    } catch (error) {
      setErrors({ submit: 'An error occurred. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Create New Reminder</h2>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-800 mb-1">
          Title *
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Doctor's appointment"
          style={{ colorScheme: 'light' }}
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="primaryPhone" className="block text-sm font-medium text-gray-800 mb-1">
          Primary Phone *
        </label>
        <input
          type="tel"
          id="primaryPhone"
          name="primaryPhone"
          value={formData.primaryPhone}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.primaryPhone ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="+12125551234"
          style={{ colorScheme: 'light' }}
        />
        {errors.primaryPhone && <p className="mt-1 text-sm text-red-600">{errors.primaryPhone}</p>}
      </div>

      <div>
        <label htmlFor="backupPhone" className="block text-sm font-medium text-gray-800 mb-1">
          Backup Phone (Optional)
        </label>
        <input
          type="tel"
          id="backupPhone"
          name="backupPhone"
          value={formData.backupPhone}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.backupPhone ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="+12125555678"
          style={{ colorScheme: 'light' }}
        />
        {errors.backupPhone && <p className="mt-1 text-sm text-red-600">{errors.backupPhone}</p>}
      </div>

      <div>
        <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-800 mb-1">
          Scheduled Time *
        </label>
        <input
          type="datetime-local"
          id="scheduledAt"
          name="scheduledAt"
          value={formData.scheduledAt}
          onChange={handleChange}
          min={getMinDateTime()}
          className={`w-full px-3 py-2 border rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.scheduledAt ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.scheduledAt && <p className="mt-1 text-sm text-red-600">{errors.scheduledAt}</p>}
      </div>

      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors ${
          isSubmitting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isSubmitting ? 'Creating...' : 'Create Reminder'}
      </button>
    </form>
  )
}