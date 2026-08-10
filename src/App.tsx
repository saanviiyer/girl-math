import { useMemo, useState } from 'react'
import { useAppState } from './lib/useAppState'
import { todayISO } from './lib/mathEngine'
import { useAuth } from './lib/auth'
import { getRepository } from './lib/repository'
import { supabase } from './lib/supabase'
import Onboarding from './components/Onboarding'
import Dashboard from './components/Dashboard'
import LogSpending from './components/LogSpending'
import History from './components/History'
import SettingsPanel from './components/SettingsPanel'
import SignIn from './components/SignIn'

type Tab = 'home' | 'log' | 'history' | 'settings'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'log', label: 'Log', icon: '➕' },
  { id: 'history', label: 'History', icon: '📜' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center animate-pop">
        <div className="text-5xl">💅</div>
        <p className="mt-3 text-sm font-semibold text-bubble-700/70">Loading your surplus…</p>
      </div>
    </div>
  )
}

export default function App() {
  const auth = useAuth()

  // If Supabase is configured but nobody is signed in, gate on the sign-in screen.
  const needsSignIn = auth.configured && !auth.user

  // Pick the backend: Supabase when signed in, localStorage otherwise. Memoized so
  // the state hook only reloads when the effective user identity changes.
  const repo = useMemo(
    () => getRepository(supabase, auth.user?.id ?? null),
    [auth.user?.id],
  )

  const app = useAppState(repo)
  const [tab, setTab] = useState<Tab>('home')

  if (auth.loading) return <Loading />
  if (needsSignIn) return <SignIn />
  if (app.loading) return <Loading />

  if (!app.settings.onboarded) {
    return (
      <Onboarding
        onComplete={(budget, currency) => {
          // (re)anchor the start date to today when onboarding completes
          app.updateSettings({ startDate: todayISO() })
          app.completeOnboarding(budget, currency)
        }}
        initialBudget={app.settings.dailyBudget}
        initialCurrency={app.settings.currency}
      />
    )
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-28 pt-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-bubble-700">Girl Math 💅</h1>
          <p className="text-xs text-bubble-700/60">
            {app.settings.currency} · {app.settings.dailyBudget}/day budget
          </p>
        </div>
        {auth.configured && auth.user && (
          <div className="flex flex-col items-end gap-1">
            <span className="max-w-[10rem] truncate text-xs font-medium text-bubble-700/70">
              {auth.user.email}
            </span>
            <button
              onClick={() => auth.signOut()}
              className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-bubble-600 ring-1 ring-bubble-100 transition hover:bg-white"
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      <main>
        {tab === 'home' && <Dashboard state={app.state} />}
        {tab === 'log' && (
          <div className="space-y-4">
            <LogSpending onAdd={app.addEntry} minDate={app.settings.startDate} />
          </div>
        )}
        {tab === 'history' && (
          <History
            entries={app.entries}
            dailyBudget={app.settings.dailyBudget}
            currency={app.settings.currency}
            onUpdate={app.updateEntry}
            onDelete={app.deleteEntry}
          />
        )}
        {tab === 'settings' && (
          <SettingsPanel settings={app.settings} onSave={app.updateSettings} onReset={app.resetAll} />
        )}
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md px-4 pb-4">
        <div className="flex items-center justify-around rounded-3xl bg-white/90 backdrop-blur shadow-lg shadow-bubble-300/40 ring-1 ring-bubble-100">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-3xl py-2.5 text-xs font-semibold transition ${
                tab === t.id ? 'text-bubble-600' : 'text-bubble-700/50'
              }`}
            >
              <span className={`text-lg ${tab === t.id ? 'scale-110' : ''} transition`}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
