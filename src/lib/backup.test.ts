import { describe, expect, it } from 'vitest'
import { backupFilename, createBackup, entriesToCSV, parseBackup } from './backup'
import type { AppState } from './types'

const state: AppState = {
  settings: { dailyBudget: 30, currency: 'USD', startDate: '2026-01-01', onboarded: true, budgetHistory: [{ effectiveDate: '2026-01-01', dailyBudget: 30 }] },
  entries: [{ id: 'one', date: '2026-01-02', amount: 12.34, note: 'Coffee, "large"', category: 'food' }],
}

describe('backups', () => {
  it('round trips complete state and uses a dated filename', () => {
    const now = new Date(2026, 0, 10, 12)
    expect(parseBackup(createBackup(state, now))).toEqual(state)
    expect(backupFilename(now)).toBe('girl-math-backup-2026-01-10.json')
  })

  it('rejects malformed or unsafe backup content', () => {
    expect(() => parseBackup('{}')).toThrow(/supported/i)
    expect(() => parseBackup(createBackup({ ...state, entries: [{ ...state.entries[0], amount: -1 }] }))).toThrow(/amount/i)
  })

  it('exports spreadsheet-safe CSV quoting', () => {
    const csv = entriesToCSV(state.entries)
    expect(csv).toContain('"Coffee, ""large"""')
    expect(csv.endsWith('\r\n')).toBe(true)
  })
})
