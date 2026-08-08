import type { AppState } from '../lib/types'
import {
  bankedSurplus,
  effectiveSpendableToday,
  formatMoney,
  recentDayStats,
  spentOn,
  todayISO,
  todayRemaining,
  underBudgetStreak,
} from '../lib/mathEngine'
import { girlMathLine, streakLine, surplusVibe } from '../lib/microcopy'
import NetBarChart from './NetBarChart'

interface Props {
  state: AppState
}

export default function Dashboard({ state }: Props) {
  const { currency } = state.settings
  const surplus = bankedSurplus(state)
  const remaining = todayRemaining(state)
  const spendable = effectiveSpendableToday(state)
  const today = todayISO()
  const spentToday = spentOn(state.entries, today)
  const todayNet = state.settings.dailyBudget - spentToday
  const streak = underBudgetStreak(state)
  const stats = recentDayStats(state, 30)

  const surplusPositive = surplus >= 0

  return (
    <div className="space-y-4">
      {/* Hero surplus card */}
      <div className="rounded-3xl bg-gradient-to-br from-bubble-500 to-purple-500 p-6 text-white shadow-xl shadow-bubble-300/50 animate-pop">
        <p className="text-sm font-semibold uppercase tracking-wide text-white/80">
          {surplusPositive ? "you've banked" : "you're running"}
        </p>
        <p className="mt-1 text-5xl font-extrabold tracking-tight">
          {formatMoney(Math.abs(surplus), currency)}
        </p>
        <p className="mt-2 text-sm text-white/85">{surplusVibe(surplus)}</p>
      </div>

      {/* Today cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-white/80 backdrop-blur p-4 shadow shadow-bubble-200/40">
          <p className="text-xs font-semibold uppercase text-bubble-700/60">Today's remaining</p>
          <p
            className={`mt-1 text-2xl font-extrabold ${
              remaining >= 0 ? 'text-bubble-700' : 'text-purple-600'
            }`}
          >
            {formatMoney(remaining, currency)}
          </p>
          <p className="mt-1 text-[11px] text-bubble-700/60">
            of {formatMoney(spendable, currency)} spendable
          </p>
        </div>
        <div className="rounded-3xl bg-white/80 backdrop-blur p-4 shadow shadow-bubble-200/40">
          <p className="text-xs font-semibold uppercase text-bubble-700/60">Streak</p>
          <p className="mt-1 text-2xl font-extrabold text-bubble-700">
            {streak} <span className="text-base font-bold">🔥</span>
          </p>
          <p className="mt-1 text-[11px] text-bubble-700/60">days under budget</p>
        </div>
      </div>

      {/* Girl math microcopy */}
      <div className="rounded-3xl bg-white/70 backdrop-blur p-4 shadow shadow-bubble-200/30">
        <p className="text-sm font-semibold text-bubble-800">💖 girl math</p>
        <p className="mt-1 text-sm text-bubble-700/80">{girlMathLine(todayNet, currency)}</p>
        <p className="mt-2 text-xs text-bubble-700/60">{streakLine(streak)}</p>
      </div>

      {/* 30-day chart */}
      <div className="rounded-3xl bg-white/80 backdrop-blur p-5 shadow shadow-bubble-200/40">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-bubble-700">Last 30 days</h2>
          <span className="text-xs text-bubble-700/60">daily net</span>
        </div>
        <div className="mt-3">
          <NetBarChart stats={stats} currency={currency} />
        </div>
      </div>
    </div>
  )
}
