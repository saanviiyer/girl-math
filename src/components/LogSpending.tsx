import { useState } from 'react'
import { todayISO } from '../lib/mathEngine'

interface Props {
  onAdd: (input: { date: string; amount: number; note?: string; category?: string }) => void
  maxDate?: string
  minDate?: string
}

const CATEGORIES = ['🍿 fun', '🍕 food', '🛍️ shopping', '🚕 transport', '💡 bills', '💖 self-care', '📦 other']

export default function LogSpending({ onAdd, maxDate = todayISO(), minDate }: Props) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [category, setCategory] = useState('')
  const [flash, setFlash] = useState(false)

  const value = Number(amount)
  const valid = Number.isFinite(value) && value >= 0 && amount.trim() !== ''

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    onAdd({
      date,
      amount: value,
      note: note.trim() || undefined,
      category: category || undefined,
    })
    setAmount('')
    setNote('')
    setCategory('')
    setFlash(true)
    setTimeout(() => setFlash(false), 900)
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl bg-white/80 backdrop-blur shadow-lg shadow-bubble-200/40 p-5"
    >
      <h2 className="text-lg font-bold text-bubble-700">Log a spend</h2>

      <div className="mt-3 flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="flex-1 rounded-2xl border border-bubble-200 bg-white px-4 py-3 text-lg font-bold text-bubble-800 outline-none focus:border-bubble-500 focus:ring-2 focus:ring-bubble-200"
        />
        <input
          type="date"
          value={date}
          max={maxDate}
          min={minDate}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-2xl border border-bubble-200 bg-white px-3 py-3 text-sm font-semibold text-bubble-800 outline-none focus:border-bubble-500"
        />
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="mt-2 w-full rounded-2xl border border-bubble-200 bg-white px-4 py-2.5 text-sm text-bubble-800 outline-none focus:border-bubble-500"
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory((prev) => (prev === c ? '' : c))}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              category === c
                ? 'bg-bubble-500 text-white'
                : 'bg-bubble-100 text-bubble-700 hover:bg-bubble-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={!valid}
        className="mt-4 w-full rounded-2xl bg-bubble-500 py-3 font-bold text-white shadow-lg shadow-bubble-300/50 transition enabled:hover:bg-bubble-600 disabled:opacity-40"
      >
        {flash ? 'Logged 💖' : 'Add spend'}
      </button>
    </form>
  )
}
