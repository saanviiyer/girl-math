import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, Entry, Settings } from './types'
import { newId } from './storage'
import { EMPTY_STATE, type Repository } from './repository'
import { normalizeBudgetHistory, round2, todayISO } from './mathEngine'

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
  restoreState: (state: AppState) => void
  canUndo: boolean
  undoLast: () => void
  persistenceError: string | null
  dismissError: () => void
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
  const [undoSnapshot, setUndoSnapshot] = useState<AppState | null>(null)
  const [persistenceError, setPersistenceError] = useState<string | null>(null)
  const stateRef = useRef(state)
  const writeQueue = useRef<Promise<void>>(Promise.resolve())

  const replaceInMemory = useCallback((next: AppState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const enqueue = useCallback((work: () => Promise<void>) => {
    writeQueue.current = writeQueue.current.then(work).catch(async (error: unknown) => {
      reportError(error)
      setPersistenceError(error instanceof Error ? error.message : 'Could not save your change.')
      try {
        const synced = await repo.load()
        replaceInMemory(synced)
      } catch (reloadError) {
        reportError(reloadError)
      }
    })
  }, [repo, replaceInMemory])

  const remember = useCallback(() => setUndoSnapshot(structuredClone(stateRef.current)), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    repo
      .load()
      .then((loaded) => {
        if (active) {
          replaceInMemory(loaded)
          if (repo.lastLoadUsedFallback) setPersistenceError('Cloud is unavailable. Showing your last saved device copy; changes will retry when you are online.')
        }
      })
      .catch((err) => {
        reportError(err)
        if (active) {
          replaceInMemory(EMPTY_STATE)
          setPersistenceError('Could not load your saved data. Check storage access or your connection, then reload.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [repo, replaceInMemory])

  const completeOnboarding = useCallback(
    (dailyBudget: number, currency: string) => {
      const previous = stateRef.current
      const startDate = todayISO()
      const budget = round2(dailyBudget)
      const settings: Settings = {
        ...previous.settings, dailyBudget: budget, currency, startDate, onboarded: true,
        budgetHistory: [{ effectiveDate: startDate, dailyBudget: budget }],
      }
      remember()
      replaceInMemory({ ...previous, settings })
      enqueue(() => repo.saveSettings(settings))
    },
    [enqueue, remember, replaceInMemory, repo],
  )

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const previous = stateRef.current
      let settings: Settings = { ...previous.settings, ...patch }
      if (patch.dailyBudget !== undefined && round2(patch.dailyBudget) !== round2(previous.settings.dailyBudget)) {
        const effectiveDate = todayISO()
        const dailyBudget = round2(patch.dailyBudget)
        const history = normalizeBudgetHistory(previous.settings)
          .filter((period) => period.effectiveDate !== effectiveDate)
        settings = { ...settings, dailyBudget, budgetHistory: [...history, { effectiveDate, dailyBudget }] }
      }
      remember()
      replaceInMemory({ ...previous, settings })
      enqueue(() => repo.saveSettings(settings))
    },
    [enqueue, remember, replaceInMemory, repo],
  )

  const addEntry = useCallback(
    (input: { date: string; amount: number; note?: string; category?: string }) => {
      const entry: Entry = { id: newId(), ...input }
      const previous = stateRef.current
      remember()
      replaceInMemory({ ...previous, entries: [...previous.entries, { ...entry, amount: round2(entry.amount) }] })
      enqueue(() => repo.addEntry({ ...entry, amount: round2(entry.amount) }))
    },
    [enqueue, remember, replaceInMemory, repo],
  )

  const updateEntry = useCallback(
    (id: string, patch: Partial<Omit<Entry, 'id'>>) => {
      const previous = stateRef.current
      const safePatch = patch.amount === undefined ? patch : { ...patch, amount: round2(patch.amount) }
      remember()
      replaceInMemory({ ...previous, entries: previous.entries.map((entry) => entry.id === id ? { ...entry, ...safePatch } : entry) })
      enqueue(() => repo.updateEntry(id, safePatch))
    },
    [enqueue, remember, replaceInMemory, repo],
  )

  const deleteEntry = useCallback(
    (id: string) => {
      const previous = stateRef.current
      remember()
      replaceInMemory({ ...previous, entries: previous.entries.filter((entry) => entry.id !== id) })
      enqueue(() => repo.deleteEntry(id))
    },
    [enqueue, remember, replaceInMemory, repo],
  )

  const resetAll = useCallback(() => {
    setUndoSnapshot(null)
    replaceInMemory(EMPTY_STATE)
    enqueue(() => repo.clear())
  }, [enqueue, replaceInMemory, repo])

  const restoreState = useCallback((next: AppState) => {
    remember()
    replaceInMemory(next)
    enqueue(() => repo.replaceAll(next))
  }, [enqueue, remember, replaceInMemory, repo])

  const undoLast = useCallback(() => {
    if (!undoSnapshot) return
    const target = undoSnapshot
    setUndoSnapshot(null)
    replaceInMemory(target)
    enqueue(() => repo.replaceAll(target))
  }, [enqueue, replaceInMemory, repo, undoSnapshot])

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
      restoreState,
      canUndo: undoSnapshot !== null,
      undoLast,
      persistenceError,
      dismissError: () => setPersistenceError(null),
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
      restoreState,
      undoSnapshot,
      undoLast,
      persistenceError,
    ],
  )
}
