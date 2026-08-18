export interface Entry {
  id: string
  /** ISO date string, YYYY-MM-DD (local day the spend belongs to) */
  date: string
  /** amount spent, in the app's currency, >= 0 */
  amount: number
  note?: string
  category?: string
}

export interface Settings {
  /** daily budget amount, > 0 */
  dailyBudget: number
  /** ISO 4217-ish currency code used for formatting, e.g. USD, EUR, GBP */
  currency: string
  /** first day the tracker is "active"; days before this are ignored */
  startDate: string
  /** whether onboarding has been completed */
  onboarded: boolean
  /** Effective-dated budget changes so editing today's budget never rewrites history. */
  budgetHistory: BudgetPeriod[]
}

export interface BudgetPeriod {
  effectiveDate: string
  dailyBudget: number
}

export interface AppState {
  settings: Settings
  entries: Entry[]
}

/** Per-day rollup used by the dashboard, history and charts. */
export interface DayStat {
  date: string
  spent: number
  budget: number
  /** budget - spent. Positive means you banked money that day. */
  net: number
}
