import { useState } from 'react'
import { useAuth } from '../lib/auth'

/** On-brand magic-link sign-in screen shown when Supabase is configured but nobody is signed in. */
export default function SignIn() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setStatus('sending')
    setError('')
    try {
      await signInWithEmail(email.trim())
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white/80 backdrop-blur shadow-xl shadow-bubble-200/50 p-7 animate-pop">
        <div className="text-5xl text-center">💅</div>
        <h1 className="mt-3 text-3xl font-extrabold text-bubble-700 text-center tracking-tight">
          Girl Math
        </h1>

        {status === 'sent' ? (
          <div className="mt-5 text-center">
            <div className="text-4xl">💌</div>
            <p className="mt-3 text-bubble-800/80 text-sm">
              Check your inbox — we sent a magic link to{' '}
              <span className="font-semibold text-bubble-700">{email.trim()}</span>. Tap it to sign
              in and sync your surplus across devices.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-5 text-sm font-semibold text-bubble-600 underline underline-offset-2"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-center text-bubble-800/70 text-sm">
              Sign in to save your budget and spending to the cloud and sync across every device.
            </p>

            <form onSubmit={handleSubmit}>
              <label className="mt-6 block text-sm font-semibold text-bubble-800" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-bubble-200 bg-white px-4 py-3 text-lg font-bold text-bubble-800 outline-none focus:border-bubble-500 focus:ring-2 focus:ring-bubble-200"
                placeholder="you@example.com"
                autoFocus
              />

              {status === 'error' && (
                <p className="mt-2 text-sm font-medium text-rose-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={!valid || status === 'sending'}
                className="mt-6 w-full rounded-2xl bg-bubble-500 py-3 text-lg font-bold text-white shadow-lg shadow-bubble-300/50 transition enabled:hover:bg-bubble-600 disabled:opacity-40"
              >
                {status === 'sending' ? 'Sending…' : 'Email me a magic link ✨'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
