import { useState } from 'react'
import type { Entry, Settings } from '../lib/types'
import { budgetForDate, formatMoney, fromISODate, spentOn } from '../lib/mathEngine'
import { CATEGORIES } from './LogSpending'

interface Props {
  entries: Entry[]
  settings: Settings
  currency: string
  onUpdate: (id: string, patch: Partial<Omit<Entry, 'id'>>) => void
  onDelete: (id: string) => void
  minDate: string
  maxDate: string
}

function prettyDate(iso: string): string {
  return fromISODate(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function History({ entries, settings, currency, onUpdate, onDelete, minDate, maxDate }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editNote, setEditNote] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editCategory, setEditCategory] = useState('')

  // group entries by date, newest day first
  const byDate = new Map<string, Entry[]>()
  for (const e of entries) {
    const list = byDate.get(e.date) ?? []
    list.push(e)
    byDate.set(e.date, list)
  }
  const days = [...byDate.keys()].sort((a, b) => (a < b ? 1 : -1))

  if (entries.length === 0) {
    return (
      <div className="rounded-3xl bg-white/70 p-6 text-center text-sm text-bubble-700/70">
        Nothing logged yet. Your spending history will show up here.
      </div>
    )
  }

  function startEdit(e: Entry) {
    setEditing(e.id)
    setEditAmount(String(e.amount))
    setEditNote(e.note ?? '')
    setEditDate(e.date)
    setEditCategory(e.category ?? '')
  }

  function saveEdit(id: string) {
    const value = Number(editAmount)
    if (Number.isFinite(value) && value > 0 && value <= 1_000_000_000 && editDate >= minDate && editDate <= maxDate) {
      onUpdate(id, { amount: value, date: editDate, category: editCategory || undefined, note: editNote.trim() || undefined })
    }
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const dayEntries = byDate.get(day)!
        const spent = spentOn(entries, day)
        const dailyBudget = budgetForDate(settings, day)
        const net = dailyBudget - spent
        const positive = net >= 0
        return (
          <div key={day} className="rounded-3xl bg-white/80 backdrop-blur shadow shadow-bubble-200/40 p-4">
            <div className="flex items-baseline justify-between">
              <h3 className="font-bold text-bubble-800">{prettyDate(day)}</h3>
              <span
                className={`text-sm font-bold ${positive ? 'text-emerald-600' : 'text-purple-600'}`}
              >
                {positive ? '+' : ''}
                {formatMoney(net, currency)}
              </span>
            </div>
            <p className="text-xs text-bubble-700/60">
              spent {formatMoney(spent, currency)} of {formatMoney(dailyBudget, currency)}
            </p>

            <ul className="mt-3 space-y-2">
              {dayEntries.map((e) => (
                <li key={e.id} className="rounded-2xl bg-bubble-50 px-3 py-2">
                  {editing === e.id ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input
                          aria-label="Amount"
                          type="number"
                          min="0.01"
                          max="1000000000"
                          step="0.01"
                          value={editAmount}
                          onChange={(ev) => setEditAmount(ev.target.value)}
                          className="w-24 rounded-xl border border-bubble-200 px-2 py-1 text-sm font-semibold text-bubble-800 outline-none focus:border-bubble-500"
                        />
                        <input aria-label="Date" type="date" min={minDate} max={maxDate} value={editDate} onChange={(ev) => setEditDate(ev.target.value)} className="rounded-xl border border-bubble-200 px-2 py-1 text-sm text-bubble-800" />
                      </div>
                      <div className="flex gap-2">
                        <select aria-label="Category" value={editCategory} onChange={(ev) => setEditCategory(ev.target.value)} className="rounded-xl border border-bubble-200 px-2 py-1 text-sm text-bubble-800">
                          <option value="">No category</option>
                          {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                        </select>
                        <input
                          aria-label="Note"
                          maxLength={500}
                          type="text"
                          value={editNote}
                          placeholder="note"
                          onChange={(ev) => setEditNote(ev.target.value)}
                          className="flex-1 rounded-xl border border-bubble-200 px-2 py-1 text-sm text-bubble-800 outline-none focus:border-bubble-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(e.id)}
                          className="rounded-xl bg-bubble-500 px-3 py-1 text-xs font-bold text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="rounded-xl bg-bubble-100 px-3 py-1 text-xs font-bold text-bubble-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-bubble-800">
                          {formatMoney(e.amount, currency)}
                        </span>
                        {e.category && <span className="ml-2 text-xs text-bubble-700/70">{e.category}</span>}
                        {e.note && <p className="truncate text-xs text-bubble-700/60">{e.note}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => startEdit(e)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-bubble-600 hover:bg-bubble-100"
                          aria-label={`Edit ${formatMoney(e.amount, currency)} entry`}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onDelete(e.id)}
                          className="rounded-lg px-2 py-1 text-xs font-semibold text-bubble-600 hover:bg-bubble-100"
                          aria-label={`Delete ${formatMoney(e.amount, currency)} entry`}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
