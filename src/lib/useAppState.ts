import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppState, Entry, Settings } from './types'
import { newId } from './storage'
import { EMPTY_STATE, type Repository } from './repository'

export interface AppApi {
  /** Backend the data is coming from ('local' or 'supabase'). */
  backend: Repository['kind']
  /** True while the initial load from the repository is in flight. */
  loading: boolean
  state: AppState
  settings: Settings
  entries: Entry[]
  completeOnboarding: (dailyBudget: number, currency: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  addEntry: (input: { date: string; amount: number; note?: string; category?: string }) => void
  updateEntry: (id: string, patch: Partial<Omit<Entry, 'id'>>) => void
  deleteEntry: (id: string) => void
  resetAll: () => void
}

/** Surface persistence errors without crashing the UI. */
function reportError(err: unknown): void {
  console.error('[girl-math] persistence error', err)
}

/**
 * App state backed by a `Repository`. UI updates optimistically and writes are
 * flushed to the repository (localStorage or Supabase) in the background. Pass a
 * new `repo` (e.g. after sign-in/out) to reload from that backend.
 */
export function useAppState(repo: Repository): AppApi {
  const [state, setState] = useState<AppState>(EMPTY_STATE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    repo
      .load()
      .then((loaded) => {
        if (active) setState(loaded)
      })
      .catch((err) => {
        reportError(err)
        if (active) setState(EMPTY_STATE)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [repo])

  const completeOnboarding = useCallback(
    (dailyBudget: number, currency: string) => {
      setState((prev) => {
        const settings: Settings = { ...prev.settings, dailyBudget, currency, onboarded: true }
        repo.saveSettings(settings).catch(reportError)
        return { ...prev, settings }
      })
    },
    [repo],
  )

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setState((prev) => {
        const settings = { ...prev.settings, ...patch }
        repo.saveSettings(settings).catch(reportError)
        return { ...prev, settings }
      })
    },
    [repo],
  )

  const addEntry = useCallback(
    (input: { date: string; amount: number; note?: string; category?: string }) => {
      const entry: Entry = { id: newId(), ...input }
      repo.addEntry(entry).catch(reportError)
      setState((prev) => ({ ...prev, entries: [...prev.entries, entry] }))
    },
    [repo],
  )

  const updateEntry = useCallback(
    (id: string, patch: Partial<Omit<Entry, 'id'>>) => {
      repo.updateEntry(id, patch).catch(reportError)
      setState((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }))
    },
    [repo],
  )

  const deleteEntry = useCallback(
    (id: string) => {
      repo.deleteEntry(id).catch(reportError)
      setState((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) }))
    },
    [repo],
  )

  const resetAll = useCallback(() => {
    repo.clear().catch(reportError)
    setState(EMPTY_STATE)
  }, [repo])

  return useMemo(
    () => ({
      backend: repo.kind,
      loading,
      state,
      settings: state.settings,
      entries: state.entries,
      completeOnboarding,
      updateSettings,
      addEntry,
      updateEntry,
      deleteEntry,
      resetAll,
    }),
    [
      repo.kind,
      loading,
      state,
      completeOnboarding,
      updateSettings,
      addEntry,
      updateEntry,
      deleteEntry,
      resetAll,
    ],
  )
}
