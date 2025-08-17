import { NextResponse } from 'next/server'
import { maskPhone, shortId, truncate } from '@/lib/log'

type InitiateParams = {
  reminderId: string
  to: string
  target: 'primary' | 'backup'
  title: string
}

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set`)
  return v
}

function buildUrl(path: string, params: Record<string, string>) {
  const base = env('APP_BASE_URL').replace(/\/$/, '')
  const usp = new URLSearchParams(params)
  return `${base}${path}?${usp.toString()}`
}

export async function initiateTwilioCall({ reminderId, to, target, title }: InitiateParams): Promise<{ sid: string }> {
  // Mock mode for local/offline testing
  if (process.env.TWILIO_MOCK === '1') {
    const sid = `CA_mock_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
    console.log(`[twilio] MOCK initiate call rid=${shortId(reminderId)} to=${maskPhone(to)} target=${target} sid=${sid}`)
    return { sid }
  }

  const accountSid = env('TWILIO_ACCOUNT_SID')
  const authToken = env('TWILIO_AUTH_TOKEN')
  const from = env('TWILIO_PHONE_NUMBER')

  const answerUrl = buildUrl('/api/voice/answer', { rid: reminderId, target })
  const statusCallback = buildUrl('/api/voice/status', { rid: reminderId, target })

  // Twilio Calls API expects x-www-form-urlencoded
  const form = new URLSearchParams()
  form.set('To', to)
  form.set('From', from)
  form.set('Url', answerUrl)
  form.set('StatusCallback', statusCallback)
  form.set('StatusCallbackMethod', 'POST')
  form.set('MachineDetection', 'Enable')

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`
  console.log(`[twilio] create call rid=${shortId(reminderId)} to=${maskPhone(to)} from=${maskPhone(from)} target=${target}`)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const msg = `Twilio call create failed: ${res.status} ${truncate(text)}`
    console.error(`[twilio] error rid=${shortId(reminderId)} target=${target} ${msg}`)
    throw new Error(msg)
  }
  const data = await res.json().catch(() => null) as any
  const sid: string | undefined = data?.sid || data?.call_sid
  if (!sid) throw new Error('Twilio response missing sid')
  console.log(`[twilio] initiated rid=${shortId(reminderId)} target=${target} sid=${sid}`)
  return { sid }
}
