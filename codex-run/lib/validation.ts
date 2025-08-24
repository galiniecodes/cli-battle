export function isE164(phone: unknown): phone is string {
  if (typeof phone !== 'string') return false
  // E.164 format: + followed by country code and subscriber number (max 15 digits)
  // Must not have leading zeros after +
  // Enforce 10-15 digits overall to avoid too-short inputs like +123
  return /^\+[1-9]\d{9,14}$/.test(phone)
}

export function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} must be a non-empty string`)
  }
  return value.trim()
}

export function parseDate(value: unknown, name: string): Date {
  if (typeof value !== 'string') {
    throw new Error(`${name} must be an ISO date string`)
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${name} must be a valid date`)
  }
  return d
}
