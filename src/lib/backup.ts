import { normalizeBudgetHistory, round2, todayISO } from './mathEngine'
import type { AppState, Entry, Settings } from './types'

export interface BackupEnvelope {
  version: 1
  app: 'girl-math'
  exportedAt: string
  data: AppState
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function validateAppState(value: unknown): AppState {
  if (!value || typeof value !== 'object') throw new Error('Backup data is missing.')
  const raw = value as { settings?: Partial<Settings>; entries?: unknown[] }
  const settings = raw.settings
  if (!settings || !Number.isFinite(settings.dailyBudget) || settings.dailyBudget! <= 0 || settings.dailyBudget! > 1_000_000) {
    throw new Error('Backup has an invalid daily budget.')
  }
  if (typeof settings.currency !== 'string' || !/^[A-Z]{3}$/.test(settings.currency)) {
    throw new Error('Backup has an invalid currency code.')
  }
  if (!validDate(settings.startDate) || typeof settings.onboarded !== 'boolean') {
    throw new Error('Backup has invalid settings dates.')
  }
  const budgetHistory = Array.isArray(settings.budgetHistory) ? settings.budgetHistory : []
  for (const period of budgetHistory) {
    if (!validDate(period?.effectiveDate) || !Number.isFinite(period?.dailyBudget) || period.dailyBudget <= 0) {
      throw new Error('Backup has an invalid budget history.')
    }
  }
  if (!Array.isArray(raw.entries) || raw.entries.length > 100_000) {
    throw new Error('Backup has an invalid number of entries.')
  }
  const ids = new Set<string>()
  const entries: Entry[] = raw.entries.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Backup contains an invalid entry.')
    const entry = item as Partial<Entry>
    if (typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)) throw new Error('Backup contains duplicate or missing entry IDs.')
    ids.add(entry.id)
    if (!validDate(entry.date) || entry.date < settings.startDate! || entry.date > todayISO()) throw new Error('Backup contains an out-of-range entry date.')
    if (!Number.isFinite(entry.amount) || entry.amount! < 0 || entry.amount! > 1_000_000_000) throw new Error('Backup contains an invalid amount.')
    if (entry.note !== undefined && (typeof entry.note !== 'string' || entry.note.length > 500)) throw new Error('Backup contains an invalid note.')
    if (entry.category !== undefined && (typeof entry.category !== 'string' || entry.category.length > 100)) throw new Error('Backup contains an invalid category.')
    return { ...entry, id: entry.id, date: entry.date, amount: round2(entry.amount!) } as Entry
  })
  const normalizedSettings: Settings = {
    dailyBudget: round2(settings.dailyBudget!),
    currency: settings.currency,
    startDate: settings.startDate,
    onboarded: settings.onboarded,
    budgetHistory: [],
  }
  normalizedSettings.budgetHistory = normalizeBudgetHistory({ ...normalizedSettings, budgetHistory })
  return { settings: normalizedSettings, entries }
}

export function createBackup(state: AppState, now = new Date()): string {
  const envelope: BackupEnvelope = { version: 1, app: 'girl-math', exportedAt: now.toISOString(), data: state }
  return JSON.stringify(envelope, null, 2)
}

export function parseBackup(text: string): AppState {
  let envelope: Partial<BackupEnvelope>
  try { envelope = JSON.parse(text) as Partial<BackupEnvelope> } catch { throw new Error('Backup is not valid JSON.') }
  if (envelope.version !== 1 || envelope.app !== 'girl-math') throw new Error('This is not a supported Girl Math backup.')
  return validateAppState(envelope.data)
}

export function backupFilename(now = new Date()): string {
  return `girl-math-backup-${todayISO(now)}.json`
}

export function entriesToCSV(entries: Entry[]): string {
  const quote = (value: string | number | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`
  return [
    ['date', 'amount', 'category', 'note', 'id'].map(quote).join(','),
    ...[...entries].sort((a, b) => a.date.localeCompare(b.date)).map((entry) =>
      [entry.date, round2(entry.amount).toFixed(2), entry.category, entry.note, entry.id].map(quote).join(',')),
  ].join('\r\n') + '\r\n'
}
