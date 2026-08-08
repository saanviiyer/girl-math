import type { AppState, DayStat, Entry, Settings } from './types'

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
  const d = fromISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Inclusive whole-day difference: how many days from `a` to `b`. */
export function daysBetween(a: string, b: string): number {
  const ms = fromISODate(b).getTime() - fromISODate(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** Inclusive list of ISO date strings from `start` to `end`. */
export function dateRange(start: string, end: string): string[] {
  if (daysBetween(start, end) < 0) return []
  const out: string[] = []
  let cur = start
  // guard against pathological ranges
  for (let i = 0; i <= 366 * 20 && daysBetween(cur, end) >= 0; i++) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

/** Sum of all spend logged against a given ISO day. */
export function spentOn(entries: Entry[], iso: string): number {
  return entries.reduce((sum, e) => (e.date === iso ? sum + e.amount : sum), 0)
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
  return dateRange(start, asOf).reduce(
    (sum, iso) => sum + (settings.dailyBudget - spentOn(entries, iso)),
    0,
  )
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
  return round2(state.settings.dailyBudget + bankedSurplus(state, now))
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
    if (spentOn(entries, cur) <= settings.dailyBudget) {
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
      budget: settings.dailyBudget,
      net: round2(settings.dailyBudget - spent),
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
        budget: settings.dailyBudget,
        net: round2(settings.dailyBudget - spent),
      }
    })
    .reverse()
}

/** Round to 2 decimal places, avoiding floating point crumbs. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
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
}
