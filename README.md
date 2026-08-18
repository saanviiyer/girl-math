# Girl Math 💅

> Set a daily budget; unspent money rolls over into a growing surplus you can splurge with.


A daily-budget **carryover tracker**. Set a daily budget, log what you spend, and
every dollar you *don't* spend becomes surplus you can splurge with later —
guilt-free. It's just math.

> you didn't spend $11 today, so really you MADE $11.

Runs two ways with the **same UI**:

- **Local demo mode (zero config)** — no backend, no accounts, all data lives in
  `localStorage`. This is the default when no Supabase env vars are set.
- **Real multi-user mode** — add a free Supabase project and the app gains email
  magic-link accounts and cloud sync across devices. See
  [Make it real / Production setup](#make-it-real--production-setup).

## How it works (the math)

Every active day from your start date through today contributes
`dailyBudget − spentThatDay` to a running **surplus**:

- Spend **under** budget → the leftover is banked and carries over.
- Spend **over** budget → it eats into your banked surplus.
- Log **nothing** for a day → you bank the full daily budget (the whole fantasy).

Key numbers on the dashboard:

- **Banked surplus** — everything carried in from days *before* today.
- **Effective spendable today** — `dailyBudget + bankedSurplus`.
- **Today's remaining** — effective spendable minus what you've logged today.
- **Streak** — consecutive under-or-on-budget days counting back from today.

All of this lives in a single pure, unit-tested module: [`src/lib/mathEngine.ts`](src/lib/mathEngine.ts).

## Features

- Onboarding to set daily budget + currency.
- Log spending for today or back-date it, with an optional note and category.
- Dashboard: big "you've banked $X" number, today's remaining, a 30-day net
  bar chart, and a streak counter.
- History grouped by day with per-day net; edit dates, amounts, categories, and notes, or delete entries with one-step undo.
- Effective-dated budgets: changes begin today without rewriting historical totals.
- Validated JSON backup/restore and spreadsheet-friendly CSV export.
- Installable offline-capable mobile web app; local mode continues working without a network.
- Settings to change the budget/currency or reset all data.
- Playful "girl math" microcopy throughout.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

### Build

```bash
npm run build      # type-checks with tsc then builds with Vite → dist/
npm run preview    # serve the production build locally
```

### Test

```bash
npm test           # runs the vitest unit tests for the carryover math
```

## Tech

- Vite + React + TypeScript
- Tailwind CSS (mobile-first)
- Hand-rolled SVG bar chart (no charting dependency)
- Vitest for the math unit tests

## Deploy

The app is a fully static SPA — `npm run build` emits everything into `dist/`.
Deploy configs are checked in: `vercel.json`, `netlify.toml`, and a
`Dockerfile` (all with an SPA fallback so unknown routes serve `index.html`).

**Vercel** (`vercel.json` included)

```bash
npm i -g vercel          # once
vercel --prod            # from the app directory
```

Or import the repo in the dashboard — the framework preset auto-detects as
**Vite** (build `npm run build`, output `dist`).

**Netlify** (`netlify.toml` included)

```bash
npm i -g netlify-cli     # once
netlify deploy --prod    # build command + publish dir come from netlify.toml
```

Or drag-and-drop the `dist/` folder into the Netlify dashboard.

**Docker** (`Dockerfile` + `nginx.conf` included — multi-stage build, served by
`nginx:alpine` with an SPA fallback)

```bash
docker build -t girl-math .
docker run -p 8080:80 girl-math   # then open http://localhost:8080
```

**Any static host** (GitHub Pages, S3, Cloudflare Pages, nginx…)

```bash
npm run build
# then serve the contents of dist/
```

Because it's a single-page app, configure your host to fall back to
`index.html` for unknown routes (the included configs already do this).

## Make it real / Production setup

Out of the box the app runs in **local-only demo mode** — no accounts, data in
`localStorage`. To turn it into a real multi-user product with accounts and cloud
sync, point it at a free [Supabase](https://supabase.com) project. It stays fully
optional: **without the two env vars below, the app still builds and runs in demo
mode.**

**1. Create a Supabase project**

Sign up at [supabase.com](https://supabase.com), create a new project (the free
tier is plenty), and wait for it to finish provisioning.

**2. Run the migration**

The schema lives in [`supabase/migrations`](supabase/migrations). Apply every migration in filename order (including `0002_budget_history.sql` for existing installations).
Apply it either way:

- **SQL editor** — open the project's *SQL Editor*, paste the contents of the
  migration file, and run it.
- **Supabase CLI** — link the project and push:

  ```bash
  supabase link --project-ref <your-project-ref>
  supabase db push
  ```

This creates `profiles`, `budget_settings`, and `spending_entries`, all with
**Row Level Security enabled** and per-row policies so each user can only ever
touch their own rows (`auth.uid() = user_id`).

**3. Enable email auth**

In *Authentication → Providers*, make sure **Email** is enabled (magic links are
on by default). Under *Authentication → URL Configuration*, add your app's
URL(s) — `http://localhost:5173` for local dev and your production domain — to
the redirect allow-list.

**4. Set the env vars**

Grab the values from *Project Settings → API* (**only** the public `anon` key,
never the service-role key):

```bash
cp .env.example .env.local
# then edit .env.local:
# VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

Restart `npm run dev`. You'll now get a sign-in screen; enter your email, click
the magic link, and your budget + spending sync to Postgres.

**5. Set the same vars in Vercel**

In the Vercel project → *Settings → Environment Variables*, add `VITE_SUPABASE_URL`
and `VITE_SUPABASE_ANON_KEY` (Production + Preview), then redeploy. Add the Vercel
domain to the Supabase redirect allow-list from step 3.

> Leave the env vars unset anywhere (local or Vercel) and that deployment simply
> runs in local-only demo mode — no code changes needed.

### How it's wired

- `src/lib/supabase.ts` — creates the client only when both env vars exist.
- `src/lib/auth.tsx` — `AuthProvider` + `useAuth()` (magic-link sign-in/out).
- `src/lib/repository.ts` — a `Repository` interface with two implementations,
  `LocalRepository` (localStorage) and `SupabaseRepository` (Postgres), selected
  at runtime by `getRepository`.
- The pure `src/lib/mathEngine.ts` and its tests are untouched — persistence is
  swapped underneath the same math.

## Data & privacy

In **local demo mode**, all data is stored locally in your browser under the
`girl-math:v1` key. Clearing site data (or the in-app **Reset all data** button)
wipes it. Nothing is sent anywhere. Use **Download backup** before clearing data or moving devices.

In **Supabase mode**, your budget settings and spending entries are stored in
your own Supabase Postgres database, scoped to your account and protected by Row
Level Security so no other user can read or write your rows. The last successful
sync is cached on the signed-in device for read-only recovery during an outage;
the app clearly warns when that fallback is in use.
