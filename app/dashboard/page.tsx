"use client"
import { useCallback, useEffect, useMemo, useState } from "react"

type Reminder = {
  id: string
  title: string
  primary_phone: string
  backup_phone: string | null
  scheduled_at: string
  next_attempt_at: string | null
  attempts: number
  backup_attempts: number
  status: "SCHEDULED" | "CALLING" | "RETRYING" | "DONE" | "ESCALATED"
  last_outcome: string | null
  created_at: string
}

const E164 = /^\+[1-9]\d{9,14}$/

function classNames(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ")
}

function StatusBadge({ status }: { status: Reminder["status"] }) {
  const map = {
    DONE: {
      text: "DONE",
      cls: "bg-green-100 text-green-800 ring-green-600/20",
    },
    CALLING: {
      text: "CALLING",
      cls: "bg-yellow-100 text-yellow-800 ring-yellow-600/20",
    },
    ESCALATED: {
      text: "ESCALATED",
      cls: "bg-red-100 text-red-800 ring-red-600/20",
    },
    SCHEDULED: {
      text: "SCHEDULED",
      cls: "bg-blue-100 text-blue-800 ring-blue-600/20",
    },
    RETRYING: {
      text: "RETRYING",
      cls: "bg-orange-100 text-orange-800 ring-orange-600/20",
    },
  } as const
  const meta = map[status]
  return (
    <span className={classNames(
      "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
      meta.cls,
    )}>
      {meta.text}
    </span>
  )
}

export default function DashboardPage() {
  const [reminders, setReminders] = useState<Reminder[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [primaryPhone, setPrimaryPhone] = useState("")
  const [backupPhone, setBackupPhone] = useState("")
  const [scheduledAt, setScheduledAt] = useState<string>("")
  const [formMsg, setFormMsg] = useState<string | null>(null)

  const fetchReminders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/reminders")
      if (!res.ok) throw new Error("Failed to fetch reminders")
      const data: Reminder[] = await res.json()
      setReminders(data)
    } catch (e: any) {
      setError(e?.message || "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReminders()
    const id = setInterval(fetchReminders, 5000)
    return () => clearInterval(id)
  }, [fetchReminders])

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false
    if (!E164.test(primaryPhone)) return false
    if (backupPhone && !E164.test(backupPhone)) return false
    if (!scheduledAt) return false
    return true
  }, [title, primaryPhone, backupPhone, scheduledAt])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormMsg(null)
    const payload = {
      title: title.trim(),
      primary_phone: primaryPhone.trim(),
      backup_phone: backupPhone.trim() || null,
      scheduled_at: new Date(scheduledAt).toISOString(),
    }
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to create")
      setFormMsg("Created reminder")
      setTitle("")
      setPrimaryPhone("")
      setBackupPhone("")
      setScheduledAt("")
      fetchReminders()
    } catch (e: any) {
      setFormMsg(e?.message || "Failed to create")
    }
  }

  async function callNow(id: string) {
    try {
      const res = await fetch("/api/call-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to trigger call")
      await fetchReminders()
    } catch (e) {
      console.error(e)
      alert((e as any)?.message || "Failed to trigger call")
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Call Reminder Dashboard</h1>

      {/* Create Form */}
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-white/50 dark:bg-black/20 p-4 rounded-lg ring-1 ring-black/10 dark:ring-white/10">
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-sm font-medium">Title</label>
          <input
            className="border rounded px-3 py-2 bg-white dark:bg-black border-black/20 dark:border-white/20"
            placeholder="Doctor appointment"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Primary Phone</label>
          <input
            className={classNames(
              "border rounded px-3 py-2 bg-white dark:bg-black",
              E164.test(primaryPhone)
                ? "border-black/20 dark:border-white/20"
                : "border-red-400 focus:border-red-500",
            )}
            placeholder="+15551234567"
            value={primaryPhone}
            onChange={(e) => setPrimaryPhone(e.target.value)}
            required
          />
          {!E164.test(primaryPhone) && primaryPhone.length > 0 && (
            <p className="text-xs text-red-600">Must be E.164, e.g., +15551234567</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Backup Phone (optional)</label>
          <input
            className={classNames(
              "border rounded px-3 py-2 bg-white dark:bg-black",
              backupPhone && !E164.test(backupPhone)
                ? "border-red-400 focus:border-red-500"
                : "border-black/20 dark:border-white/20",
            )}
            placeholder="+15557654321"
            value={backupPhone}
            onChange={(e) => setBackupPhone(e.target.value)}
          />
          {backupPhone && !E164.test(backupPhone) && (
            <p className="text-xs text-red-600">Must be E.164, e.g., +15557654321</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Scheduled At</label>
          <input
            type="datetime-local"
            className="border rounded px-3 py-2 bg-white dark:bg-black border-black/20 dark:border-white/20"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            disabled={!canSubmit}
            className={classNames(
              "h-[38px] md:h-[40px] rounded bg-blue-600 text-white px-4 font-medium",
              !canSubmit && "opacity-50 cursor-not-allowed",
            )}
          >
            Create
          </button>
          {formMsg && (
            <p className="text-xs text-neutral-600 dark:text-neutral-300">{formMsg}</p>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-black/10 dark:border-white/10">
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Attempts</th>
              <th className="py-2 pr-4">Next Attempt</th>
              <th className="py-2 pr-4">Last Outcome</th>
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="py-3" colSpan={7}>Loading…</td>
              </tr>
            )}
            {error && (
              <tr>
                <td className="py-3 text-red-600" colSpan={7}>{error}</td>
              </tr>
            )}
            {reminders?.length === 0 && !loading && !error && (
              <tr>
                <td className="py-3" colSpan={7}>No reminders yet.</td>
              </tr>
            )}
            {reminders?.map((r) => (
              <tr key={r.id} className="border-b border-black/5 dark:border-white/5">
                <td className="py-2 pr-4">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-neutral-500">{r.primary_phone}{r.backup_phone ? ` → ${r.backup_phone}` : ""}</div>
                </td>
                <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
                <td className="py-2 pr-4">{r.attempts + (r.backup_attempts || 0)}</td>
                <td className="py-2 pr-4">{r.next_attempt_at ? new Date(r.next_attempt_at).toLocaleString() : "—"}</td>
                <td className="py-2 pr-4">{r.last_outcome || "—"}</td>
                <td className="py-2 pr-4">{new Date(r.created_at).toLocaleString()}</td>
                <td className="py-2 pr-2">
                  <button
                    className="rounded bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-medium"
                    onClick={() => callNow(r.id)}
                  >
                    Call Now
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

