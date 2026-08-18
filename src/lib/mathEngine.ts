import type { AppState, BudgetPeriod, DayStat, Entry, Settings } from './types'

/**
 * Girl Math carryover engine.
 *
 * Core idea: every active day contributes (dailyBudget - amountSpentThatDay)
 * to a running "surplus". Spend less than budget and the leftover is banked;
 * spend more and it eats into the banked surplus. A day with no logged spend
 * banks the full daily budget — that is the whole "girl math" fantasy.
 *
 * All functions here are pure so they can be unit tested in isolation.
 */

/** Format a Date as a local YYYY-MM-DD string (timezone-safe, no UTC shift). */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Parse a YYYY-MM-DD string into a local Date at midnight. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** Today's local date as YYYY-MM-DD. `now` is injectable for testing. */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

/** Add `n` days (may be negative) to an ISO date string. */
export function addDays(iso: string, n: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day + n))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** Inclusive whole-day difference: how many days from `a` to `b`. */
export function daysBetween(a: string, b: string): number {
  const ordinal = (iso: string) => {
    const [year, month, day] = iso.split('-').map(Number)
    return Date.UTC(year, month - 1, day) / 86_400_000
  }
  return ordinal(b) - ordinal(a)
}

/** Inclusive list of ISO date strings from `start` to `end`. */
export function dateRange(start: string, end: string): string[] {
  const length = daysBetween(start, end)
  if (!Number.isInteger(length) || length < 0) return []
  // Protect rendering from corrupt imports while supporting a lifetime of data.
  if (length > 366 * 100) throw new Error('Date range exceeds 100 years')
  return Array.from({ length: length + 1 }, (_, index) => addDays(start, index))
}

/** Sum of all spend logged against a given ISO day. */
export function spentOn(entries: Entry[], iso: string): number {
  const cents = entries.reduce((sum, e) => (e.date === iso ? sum + toCents(e.amount) : sum), 0)
  return cents / 100
}

export function normalizeBudgetHistory(settings: Settings): BudgetPeriod[] {
  const source = settings.budgetHistory?.length
    ? settings.budgetHistory
    : [{ effectiveDate: settings.startDate, dailyBudget: settings.dailyBudget }]
  const byDate = new Map<string, BudgetPeriod>()
  for (const period of source) {
    if (period.effectiveDate >= settings.startDate && Number.isFinite(period.dailyBudget) && period.dailyBudget > 0) {
      byDate.set(period.effectiveDate, { ...period, dailyBudget: round2(period.dailyBudget) })
    }
  }
  if (!byDate.has(settings.startDate)) {
    byDate.set(settings.startDate, { effectiveDate: settings.startDate, dailyBudget: round2(settings.dailyBudget) })
  }
  return [...byDate.values()].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
}

export function budgetForDate(settings: Settings, iso: string): number {
  const history = normalizeBudgetHistory(settings)
  let budget = history[0]?.dailyBudget ?? settings.dailyBudget
  for (const period of history) {
    if (period.effectiveDate > iso) break
    budget = period.dailyBudget
  }
  return budget
}

/**
 * Surplus banked across all active days from settings.startDate through
 * (and including) `asOf`. Every day in the window contributes
 * (dailyBudget - spentThatDay), so empty days bank the full budget.
 */
export function surplusThrough(state: AppState, asOf: string): number {
  const { settings, entries } = state
  const start = settings.startDate
  if (daysBetween(start, asOf) < 0) return 0
  const cents = dateRange(start, asOf).reduce(
    (sum, iso) => sum + toCents(budgetForDate(settings, iso)) - toCents(spentOn(entries, iso)),
    0,
  )
  return cents / 100
}

/**
 * The headline "you've banked $X": surplus carried in from every day BEFORE
 * today. Today is still in progress, so it is reported separately.
 */
export function bankedSurplus(state: AppState, now: Date = new Date()): number {
  const yesterday = addDays(todayISO(now), -1)
  return round2(surplusThrough(state, yesterday))
}

/** Total effective money you can spend today = daily budget + carried surplus. */
export function effectiveSpendableToday(state: AppState, now: Date = new Date()): number {
  return round2(budgetForDate(state.settings, todayISO(now)) + bankedSurplus(state, now))
}

/** How much of today's effective spendable is left after what you've logged. */
export function todayRemaining(state: AppState, now: Date = new Date()): number {
  const today = todayISO(now)
  return round2(effectiveSpendableToday(state, now) - spentOn(state.entries, today))
}

/**
 * Streak of consecutive under-or-on-budget days, counting back from today.
 * A day counts if what you spent that day is <= the daily budget. The streak
 * breaks on the first over-budget day (today included).
 */
export function underBudgetStreak(state: AppState, now: Date = new Date()): number {
  const { settings, entries } = state
  let streak = 0
  let cur = todayISO(now)
  while (daysBetween(settings.startDate, cur) >= 0) {
    if (toCents(spentOn(entries, cur)) <= toCents(budgetForDate(settings, cur))) {
      streak++
      cur = addDays(cur, -1)
    } else {
      break
    }
  }
  return streak
}

/** Per-day rollups over the last `days` days (oldest first), for charts/history. */
export function recentDayStats(
  state: AppState,
  days = 30,
  now: Date = new Date(),
): DayStat[] {
  const { settings, entries } = state
  const end = todayISO(now)
  const start = addDays(end, -(days - 1))
  return dateRange(start, end).map((iso) => {
    const spent = spentOn(entries, iso)
    return {
      date: iso,
      spent: round2(spent),
      budget: budgetForDate(settings, iso),
      net: round2(budgetForDate(settings, iso) - spent),
    }
  })
}

/** Every day from startDate..today that has at least one entry, newest first. */
export function historyDayStats(state: AppState, now: Date = new Date()): DayStat[] {
  const { settings, entries } = state
  const daysWithEntries = new Set(entries.map((e) => e.date))
  const today = todayISO(now)
  return dateRange(settings.startDate, today)
    .filter((iso) => daysWithEntries.has(iso))
    .map((iso) => {
      const spent = spentOn(entries, iso)
      return {
        date: iso,
        spent: round2(spent),
        budget: budgetForDate(settings, iso),
        net: round2(budgetForDate(settings, iso) - spent),
      }
    })
    .reverse()
}

/** Round to 2 decimal places, avoiding floating point crumbs. */
export function round2(n: number): number {
  return toCents(n) / 100
}

export function toCents(n: number): number {
  return Math.round((n + Math.sign(n) * Number.EPSILON) * 100)
}

/** Format a number as currency using the Intl API, falling back gracefully. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${round2(amount).toFixed(2)}`
  }
}

export const DEFAULT_SETTINGS: Settings = {
  dailyBudget: 30,
  currency: 'USD',
  startDate: todayISO(),
  onboarded: false,
  budgetHistory: [],
}
