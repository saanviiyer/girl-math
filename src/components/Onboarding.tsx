import { useState } from 'react'

interface Props {
  onComplete: (dailyBudget: number, currency: string) => void
  initialBudget?: number
  initialCurrency?: string
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY']

export default function Onboarding({ onComplete, initialBudget = 30, initialCurrency = 'USD' }: Props) {
  const [budget, setBudget] = useState(String(initialBudget))
  const [currency, setCurrency] = useState(initialCurrency)

  const value = Number(budget)
  const valid = Number.isFinite(value) && value > 0

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white/80 backdrop-blur shadow-xl shadow-bubble-200/50 p-7 animate-pop">
        <div className="text-5xl text-center">💅</div>
        <h1 className="mt-3 text-3xl font-extrabold text-bubble-700 text-center tracking-tight">
          Girl Math
        </h1>
        <p className="mt-2 text-center text-bubble-800/70 text-sm">
          Set a daily budget. Every dollar you <em>don't</em> spend becomes surplus you can splurge
          with — guilt-free. It's just math.
        </p>

        <label className="mt-6 block text-sm font-semibold text-bubble-800">Daily budget</label>
        <div className="mt-1 flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="flex-1 rounded-2xl border border-bubble-200 bg-white px-4 py-3 text-lg font-bold text-bubble-800 outline-none focus:border-bubble-500 focus:ring-2 focus:ring-bubble-200"
            placeholder="30"
            autoFocus
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-2xl border border-bubble-200 bg-white px-3 py-3 font-semibold text-bubble-800 outline-none focus:border-bubble-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          disabled={!valid}
          onClick={() => onComplete(value, currency)}
          className="mt-6 w-full rounded-2xl bg-bubble-500 py-3 text-lg font-bold text-white shadow-lg shadow-bubble-300/50 transition enabled:hover:bg-bubble-600 disabled:opacity-40"
        >
          Start banking surplus →
        </button>
      </div>
    </div>
  )
}
