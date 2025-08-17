export function maskPhone(p?: string | null) {
  if (!p) return 'n/a'
  const s = String(p)
  const last = s.slice(-4)
  return s.startsWith('+') ? `+***${last}` : `***${last}`
}

export function shortId(id?: string | null) {
  if (!id) return 'n/a'
  return String(id).slice(-6)
}

export function truncate(value: string, max = 256) {
  return value.length > max ? value.slice(0, max) + '…' : value
}

