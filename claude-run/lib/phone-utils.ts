export function validateE164Phone(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{10,14}$/
  return e164Regex.test(phone)
}

export function formatPhoneDisplay(phone: string): string {
  if (!phone) return ''
  
  if (phone.startsWith('+1') && phone.length === 12) {
    const areaCode = phone.slice(2, 5)
    const prefix = phone.slice(5, 8)
    const lineNumber = phone.slice(8, 12)
    return `+1 (${areaCode}) ${prefix}-${lineNumber}`
  }
  
  return phone
}