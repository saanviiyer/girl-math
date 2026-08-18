import { describe, expect, it } from 'vitest'
import type { AppState, Entry, Settings } from './types'
import {
  addDays,
  bankedSurplus,
  dateRange,
  effectiveSpendableToday,
  recentDayStats,
  round2,
  spentOn,
  surplusThrough,
  todayRemaining,
  underBudgetStreak,
} from './mathEngine'

const NOW = new Date(2026, 0, 10, 12, 0, 0) // 2026-01-10, local noon
const TODAY = '2026-01-10'

function makeState(dailyBudget: number, startDate: string, entries: Entry[]): AppState {
  const settings: Settings = {
    dailyBudget, currency: 'USD', startDate, onboarded: true,
    budgetHistory: [{ effectiveDate: startDate, dailyBudget }],
  }
  return { settings, entries }
}

function entry(date: string, amount: number): Entry {
  return { id: `${date}-${amount}-${Math.random()}`, date, amount }
}

describe('date helpers', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('builds an inclusive date range', () => {
    expect(dateRange('2026-01-08', '2026-01-10')).toEqual([
      '2026-01-08',
      '2026-01-09',
      '2026-01-10',
    ])
  })

  it('sums spend on a single day', () => {
    const entries = [entry('2026-01-09', 5), entry('2026-01-09', 7), entry('2026-01-10', 3)]
    expect(spentOn(entries, '2026-01-09')).toBe(12)
  })
})

describe('carryover surplus math', () => {
  it('preserves historical days when the budget changes', () => {
    const state = makeState(50, '2026-01-08', [])
    state.settings.budgetHistory = [
      { effectiveDate: '2026-01-08', dailyBudget: 30 },
      { effectiveDate: '2026-01-09', dailyBudget: 50 },
    ]
    expect(bankedSurplus(state, NOW)).toBe(80)
  })

  it('sums in integer cents across many entries', () => {
    const state = makeState(1, '2026-01-09', Array.from({ length: 10 }, (_, i) => entry('2026-01-09', i === 9 ? 0.1 : 0.1)))
    expect(spentOn(state.entries, '2026-01-09')).toBe(1)
    expect(bankedSurplus(state, NOW)).toBe(0)
  })
  it('banks the leftover when you underspend', () => {
    // budget 30/day, started 3 days ago. Days 8,9 under budget, spent 20 each.
    const state = makeState(30, '2026-01-08', [
      entry('2026-01-08', 20),
      entry('2026-01-09', 20),
    ])
    // through 2026-01-09 (yesterday): (30-20) + (30-20) = 20 banked
    expect(bankedSurplus(state, NOW)).toBe(20)
  })

  it('counts an empty day as banking the whole budget', () => {
    // started 2 days before today, logged nothing at all
    const state = makeState(30, addDays(TODAY, -2), [])
    // yesterday and the day before both empty => 30 + 30 = 60 banked
    expect(bankedSurplus(state, NOW)).toBe(60)
  })

  it('overspending eats into the banked surplus', () => {
    // day -2: spent 10 (banks 20). day -1: spent 50 (loses 20). net 0.
    const state = makeState(30, addDays(TODAY, -2), [
      entry(addDays(TODAY, -2), 10),
      entry(addDays(TODAY, -1), 50),
    ])
    expect(bankedSurplus(state, NOW)).toBe(0)
  })

  it('effective spendable today = daily budget + carried surplus', () => {
    const state = makeState(30, addDays(TODAY, -1), [entry(addDays(TODAY, -1), 10)])
    // yesterday banked 20, so today you can spend 30 + 20 = 50
    expect(effectiveSpendableToday(state, NOW)).toBe(50)
  })

  it("today's remaining subtracts what you already spent today", () => {
    const state = makeState(30, addDays(TODAY, -1), [
      entry(addDays(TODAY, -1), 10), // banks 20
      entry(TODAY, 15), // spent today
    ])
    // spendable 50 - 15 spent today = 35 remaining
    expect(todayRemaining(state, NOW)).toBe(35)
  })

  it('surplusThrough includes the asOf day itself', () => {
    const state = makeState(30, addDays(TODAY, -2), [entry(addDays(TODAY, -2), 5)])
    // only the -2 day is logged: (30-5)=25, plus empty -1 day: +30 => through yesterday 55
    expect(surplusThrough(state, addDays(TODAY, -1))).toBe(55)
  })
})

describe('streaks and stats', () => {
  it('counts consecutive under-or-on-budget days back from today', () => {
    const state = makeState(30, addDays(TODAY, -4), [
      entry(addDays(TODAY, -1), 25), // under
      entry(TODAY, 30), // exactly on budget counts
    ])
    // today (30 ok), -1 (25 ok), -2 empty (ok), -3 empty (ok), -4 empty (ok) = 5
    expect(underBudgetStreak(state, NOW)).toBe(5)
  })

  it('breaks the streak on an over-budget day', () => {
    const state = makeState(30, addDays(TODAY, -3), [entry(TODAY, 40)])
    expect(underBudgetStreak(state, NOW)).toBe(0)
  })

  it('produces one stat per day over the window, oldest first', () => {
    const state = makeState(30, addDays(TODAY, -10), [entry(TODAY, 12)])
    const stats = recentDayStats(state, 7, NOW)
    expect(stats).toHaveLength(7)
    expect(stats[0].date).toBe(addDays(TODAY, -6))
    expect(stats[6].date).toBe(TODAY)
    expect(stats[6].net).toBe(18) // 30 - 12
  })
})

describe('rounding', () => {
  it('avoids floating point crumbs', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(round2(30 - 19.99)).toBe(10.01)
  })
})
