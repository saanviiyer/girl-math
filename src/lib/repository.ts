import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppState, Entry, Settings } from './types'
import { DEFAULT_SETTINGS } from './mathEngine'
import { clearState, loadState, saveState } from './storage'

/**
 * Data-access abstraction used by the app.
 *
 * Two implementations exist:
 *  - `LocalRepository`  — the original localStorage behavior (anonymous / offline).
 *  - `SupabaseRepository` — cloud persistence in Postgres, one row-set per user.
 *
 * The active implementation is chosen at runtime by `getRepository`: without
 * Supabase env vars, or without a signed-in user, the app falls back to local
 * mode so it always builds and runs with zero config.
 */
export interface Repository {
  /** Which backend is in use — handy for UI copy. */
  readonly kind: 'local' | 'supabase'
  /** Load the full app state (settings + entries). */
  load(): Promise<AppState>
  /** Persist the settings object. */
  saveSettings(settings: Settings): Promise<void>
  /** Append a spending entry. */
  addEntry(entry: Entry): Promise<void>
  /** Patch an existing entry by id. */
  updateEntry(id: string, patch: Partial<Omit<Entry, 'id'>>): Promise<void>
  /** Remove an entry by id. */
  deleteEntry(id: string): Promise<void>
  /** Wipe all of this user's data. */
  clear(): Promise<void>
}

const EMPTY_STATE: AppState = {
  settings: DEFAULT_SETTINGS,
  entries: [],
}

/** localStorage-backed repository — preserves the original demo behavior exactly. */
export class LocalRepository implements Repository {
  readonly kind = 'local' as const

  async load(): Promise<AppState> {
    return loadState()
  }

  async saveSettings(settings: Settings): Promise<void> {
    const s = loadState()
    saveState({ ...s, settings })
  }

  async addEntry(entry: Entry): Promise<void> {
    const s = loadState()
    saveState({ ...s, entries: [...s.entries, entry] })
  }

  async updateEntry(id: string, patch: Partial<Omit<Entry, 'id'>>): Promise<void> {
    const s = loadState()
    saveState({
      ...s,
      entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })
  }

  async deleteEntry(id: string): Promise<void> {
    const s = loadState()
    saveState({ ...s, entries: s.entries.filter((e) => e.id !== id) })
  }

  async clear(): Promise<void> {
    clearState()
  }
}

/** Shape of a `spending_entries` row in Postgres. */
interface EntryRow {
  id: string
  user_id: string
  date: string
  amount: number
  note: string | null
  category: string | null
}

/** Shape of a `budget_settings` row in Postgres. */
interface SettingsRow {
  user_id: string
  daily_budget: number
  currency: string
  start_date: string
  onboarded: boolean
}

function rowToEntry(row: EntryRow): Entry {
  const entry: Entry = { id: row.id, date: row.date, amount: Number(row.amount) }
  if (row.note != null) entry.note = row.note
  if (row.category != null) entry.category = row.category
  return entry
}

function rowToSettings(row: SettingsRow): Settings {
  return {
    dailyBudget: Number(row.daily_budget),
    currency: row.currency,
    startDate: row.start_date,
    onboarded: row.onboarded,
  }
}

/**
 * Supabase/Postgres-backed repository.
 *
 * Every row is keyed by `user_id`; Row Level Security (see the migration)
 * guarantees a user can only ever touch their own rows. All writes therefore
 * stamp `user_id` from the authenticated session.
 */
export class SupabaseRepository implements Repository {
  readonly kind = 'supabase' as const

  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async load(): Promise<AppState> {
    const [settingsRes, entriesRes] = await Promise.all([
      this.client
        .from('budget_settings')
        .select('user_id, daily_budget, currency, start_date, onboarded')
        .eq('user_id', this.userId)
        .maybeSingle<SettingsRow>(),
      this.client
        .from('spending_entries')
        .select('id, user_id, date, amount, note, category')
        .eq('user_id', this.userId)
        .order('date', { ascending: true }),
    ])

    if (settingsRes.error) throw settingsRes.error
    if (entriesRes.error) throw entriesRes.error

    const settings = settingsRes.data ? rowToSettings(settingsRes.data) : DEFAULT_SETTINGS
    const entries = (entriesRes.data ?? []).map(rowToEntry)
    return { settings, entries }
  }

  async saveSettings(settings: Settings): Promise<void> {
    const row: SettingsRow = {
      user_id: this.userId,
      daily_budget: settings.dailyBudget,
      currency: settings.currency,
      start_date: settings.startDate,
      onboarded: settings.onboarded,
    }
    const { error } = await this.client
      .from('budget_settings')
      .upsert(row, { onConflict: 'user_id' })
    if (error) throw error
  }

  async addEntry(entry: Entry): Promise<void> {
    const row: EntryRow = {
      id: entry.id,
      user_id: this.userId,
      date: entry.date,
      amount: entry.amount,
      note: entry.note ?? null,
      category: entry.category ?? null,
    }
    const { error } = await this.client.from('spending_entries').insert(row)
    if (error) throw error
  }

  async updateEntry(id: string, patch: Partial<Omit<Entry, 'id'>>): Promise<void> {
    const row: Partial<EntryRow> = {}
    if (patch.date !== undefined) row.date = patch.date
    if (patch.amount !== undefined) row.amount = patch.amount
    if (patch.note !== undefined) row.note = patch.note ?? null
    if (patch.category !== undefined) row.category = patch.category ?? null
    const { error } = await this.client
      .from('spending_entries')
      .update(row)
      .eq('id', id)
      .eq('user_id', this.userId)
    if (error) throw error
  }

  async deleteEntry(id: string): Promise<void> {
    const { error } = await this.client
      .from('spending_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId)
    if (error) throw error
  }

  async clear(): Promise<void> {
    const [entriesRes, settingsRes] = await Promise.all([
      this.client.from('spending_entries').delete().eq('user_id', this.userId),
      this.client.from('budget_settings').delete().eq('user_id', this.userId),
    ])
    if (entriesRes.error) throw entriesRes.error
    if (settingsRes.error) throw settingsRes.error
  }
}

export { EMPTY_STATE }

/**
 * Pick the repository for the current runtime.
 * Cloud when Supabase is configured AND a user is signed in; local otherwise.
 */
export function getRepository(
  client: SupabaseClient | null,
  userId: string | null,
): Repository {
  if (client && userId) return new SupabaseRepository(client, userId)
  return new LocalRepository()
}
