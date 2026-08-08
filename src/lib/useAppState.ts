import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppState, Entry, Settings } from './types'
import { clearState, loadState, newId, saveState } from './storage'

export interface AppApi {
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

export function useAppState(): AppApi {
  const [state, setState] = useState<AppState>(() => loadState())

  useEffect(() => {
    saveState(state)
  }, [state])

  const completeOnboarding = useCallback((dailyBudget: number, currency: string) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, dailyBudget, currency, onboarded: true },
    }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }, [])

  const addEntry = useCallback(
    (input: { date: string; amount: number; note?: string; category?: string }) => {
      setState((prev) => ({
        ...prev,
        entries: [...prev.entries, { id: newId(), ...input }],
      }))
    },
    [],
  )

  const updateEntry = useCallback((id: string, patch: Partial<Omit<Entry, 'id'>>) => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
  }, [])

  const deleteEntry = useCallback((id: string) => {
    setState((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== id) }))
  }, [])

  const resetAll = useCallback(() => {
    clearState()
    setState(loadState())
  }, [])

  return useMemo(
    () => ({
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
    [state, completeOnboarding, updateSettings, addEntry, updateEntry, deleteEntry, resetAll],
  )
}
