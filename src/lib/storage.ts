import type { AppState, Entry, Settings } from './types'
import { DEFAULT_SETTINGS } from './mathEngine'

const KEY = 'girl-math:v1'

const EMPTY_STATE: AppState = {
  settings: { ...DEFAULT_SETTINGS, budgetHistory: [] },
  entries: [],
}

/** Load persisted state from localStorage, tolerating missing/corrupt data. */
export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return EMPTY_STATE
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY_STATE
    const parsed = JSON.parse(raw) as Partial<AppState>
    const rawSettings = (parsed.settings ?? {}) as Partial<Settings>
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      budgetHistory: Array.isArray(rawSettings.budgetHistory)
        ? rawSettings.budgetHistory.filter(isValidBudgetPeriod)
        : [],
    }
    const entries: Entry[] = Array.isArray(parsed.entries)
      ? parsed.entries.filter(isValidEntry)
      : []
    return { settings, entries }
  } catch {
    return EMPTY_STATE
  }
}

/** Persist state to localStorage. No-ops outside the browser. */
export function saveState(state: AppState): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(state))
}

/** Wipe all persisted data (used by the "reset" action). */
export function clearState(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(KEY)
}

function isValidEntry(e: unknown): e is Entry {
  if (!e || typeof e !== 'object') return false
  const r = e as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    typeof r.amount === 'number' &&
    Number.isFinite(r.amount) && r.amount >= 0
  )
}

function isValidBudgetPeriod(value: unknown): value is Settings['budgetHistory'][number] {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.effectiveDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.effectiveDate) &&
    typeof row.dailyBudget === 'number' && Number.isFinite(row.dailyBudget) && row.dailyBudget > 0
}

/** Cryptographically-ish unique id that works everywhere. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
