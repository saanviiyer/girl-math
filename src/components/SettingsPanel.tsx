import { useState } from 'react'
import type { Settings } from '../lib/types'

interface Props {
  settings: Settings
  onSave: (patch: Partial<Settings>) => void
  onReset: () => void
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY']

export default function SettingsPanel({ settings, onSave, onReset }: Props) {
  const [budget, setBudget] = useState(String(settings.dailyBudget))
  const [currency, setCurrency] = useState(settings.currency)
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const value = Number(budget)
  const valid = Number.isFinite(value) && value > 0

  function save() {
    if (!valid) return
    onSave({ dailyBudget: value, currency })
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur shadow-lg shadow-bubble-200/40 p-5 space-y-4">
      <h2 className="text-lg font-bold text-bubble-700">Settings</h2>

      <div>
        <label className="block text-sm font-semibold text-bubble-800">Daily budget</label>
        <div className="mt-1 flex gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="flex-1 rounded-2xl border border-bubble-200 bg-white px-4 py-3 text-lg font-bold text-bubble-800 outline-none focus:border-bubble-500 focus:ring-2 focus:ring-bubble-200"
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
        <p className="mt-1 text-xs text-bubble-700/60">
          Changing the budget recomputes every day's net going forward and back.
        </p>
      </div>

      <button
        onClick={save}
        disabled={!valid}
        className="w-full rounded-2xl bg-bubble-500 py-3 font-bold text-white shadow-lg shadow-bubble-300/50 transition enabled:hover:bg-bubble-600 disabled:opacity-40"
      >
        {saved ? 'Saved 💖' : 'Save settings'}
      </button>

      <div className="border-t border-bubble-100 pt-4">
        {confirmReset ? (
          <div className="space-y-2">
            <p className="text-sm text-bubble-800">
              Delete all data and start over? This can't be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onReset()
                  setConfirmReset(false)
                }}
                className="flex-1 rounded-2xl bg-purple-500 py-2.5 font-bold text-white"
              >
                Yes, reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 rounded-2xl bg-bubble-100 py-2.5 font-bold text-bubble-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="w-full rounded-2xl border border-purple-200 py-2.5 text-sm font-semibold text-purple-600 hover:bg-purple-50"
          >
            Reset all data
          </button>
        )}
      </div>
    </div>
  )
}
