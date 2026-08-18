import { useState } from 'react'
import type { Settings } from '../lib/types'

interface Props {
  settings: Settings
  onSave: (patch: Partial<Settings>) => void
  onReset: () => void
  backend: 'local' | 'supabase'
  onExportBackup: () => void
  onExportCSV: () => void
  onRestore: (file: File) => void
  displayName: string
  onUpdateProfile?: (displayName: string) => Promise<void>
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY']

export default function SettingsPanel({ settings, backend, displayName, onUpdateProfile, onSave, onReset, onExportBackup, onExportCSV, onRestore }: Props) {
  const [budget, setBudget] = useState(String(settings.dailyBudget))
  const [currency, setCurrency] = useState(settings.currency)
  const [saved, setSaved] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [name, setName] = useState(displayName)
  const [profileStatus, setProfileStatus] = useState('')

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

      {onUpdateProfile && (
        <section aria-labelledby="profile-heading">
          <h3 id="profile-heading" className="text-sm font-semibold text-bubble-800">Account profile</h3>
          <div className="mt-1 flex gap-2">
            <input aria-label="Display name" autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Display name" className="min-w-0 flex-1 rounded-2xl border border-bubble-200 bg-white px-4 py-2.5 text-bubble-800 outline-none focus:border-bubble-500" />
            <button type="button" onClick={async () => { setProfileStatus('Saving…'); try { await onUpdateProfile(name); setProfileStatus('Saved') } catch { setProfileStatus('Could not save') } }} className="rounded-2xl bg-bubble-100 px-4 text-sm font-bold text-bubble-700">Save</button>
          </div>
          {profileStatus && <p className="mt-1 text-xs text-bubble-700/70" role="status">{profileStatus}</p>}
        </section>
      )}

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
          A new budget starts today. Past daily totals keep the budget that applied then.
        </p>
      </div>

      <button
        onClick={save}
        disabled={!valid}
        className="w-full rounded-2xl bg-bubble-500 py-3 font-bold text-white shadow-lg shadow-bubble-300/50 transition enabled:hover:bg-bubble-600 disabled:opacity-40"
      >
        {saved ? 'Saved 💖' : 'Save settings'}
      </button>

      <section className="border-t border-bubble-100 pt-4" aria-labelledby="data-heading">
        <h3 id="data-heading" className="font-bold text-bubble-800">Your data</h3>
        <p className="mt-1 text-xs text-bubble-700/60">Stored {backend === 'supabase' ? 'in your signed-in cloud account' : 'only in this browser'}. Download a backup before switching devices or clearing browser data.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onExportBackup} className="rounded-2xl bg-bubble-100 py-2.5 text-sm font-bold text-bubble-700">Download backup</button>
          <button type="button" onClick={onExportCSV} className="rounded-2xl bg-bubble-100 py-2.5 text-sm font-bold text-bubble-700">Export CSV</button>
        </div>
        <label className="mt-2 block cursor-pointer rounded-2xl border border-bubble-200 py-2.5 text-center text-sm font-bold text-bubble-700 hover:bg-bubble-50">
          Restore backup
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onRestore(file); event.target.value = '' }} />
        </label>
      </section>

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
