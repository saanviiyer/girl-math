# girl-math

Girl Math is a daily budget tracker with carryover. You set a daily budget and log what you spend. Each dollar you do not spend becomes surplus that you can spend later.

> you didn't spend $11 today, so really you MADE $11.

The app runs in two modes with the same UI. Local demo mode needs no setup and keeps all data in `localStorage`. With a Supabase project, the app adds email magic-link accounts and cloud sync across devices.

## How the math works

Each active day from your start date through today adds `dailyBudget - spentThatDay` to a running surplus.

- If you spend under budget, the app banks the rest.
- If you spend over budget, the extra comes out of your banked surplus.
- If you log nothing for a day, you bank the full daily budget.

The dashboard shows these numbers:

- **Banked surplus.** All carryover from days before today.
- **Effective spendable today.** `dailyBudget + bankedSurplus`.
- **Today's remaining.** Effective spendable minus what you logged today.
- **Streak.** Consecutive days at or under budget, counted back from today.

This logic lives in one pure, unit-tested module, `src/lib/mathEngine.ts`.

## Features

- Onboarding to set a daily budget and currency.
- Log spending for today or an earlier date, with an optional note and category.
- Dashboard with the banked amount, today's remaining, a 30-day net bar chart and a streak counter.
- History grouped by day with the net for each day. You can edit the date, amount, category and note of an entry, or delete it with one-step undo.
- Budgets with effective dates. A change starts today and does not rewrite past totals.
- Validated JSON backup and restore, and CSV export for spreadsheets.
- Installable mobile web app that works offline. Local mode keeps working with no network.
- Settings to change the budget or currency, or to reset all data.

## Run it

```bash
git clone https://github.com/saanviiyer/girl-math
cd girl-math
npm install
npm run dev        # Vite dev server, default http://localhost:5173
npm test           # Vitest unit tests for the carryover math and backups
npm run build      # tsc type check, then Vite build to dist/
npm run preview    # serve the production build
```

### Deploy

The build output in `dist/` is a static single-page app. The repo includes `vercel.json`, `netlify.toml` and a `Dockerfile` (nginx). Each one falls back to `index.html` for unknown routes.

```bash
vercel --prod                     # Vercel
netlify deploy --prod             # Netlify
docker build -t girl-math .       # Docker
docker run -p 8080:80 girl-math
```

On any other static host, serve `dist/` and set a fallback to `index.html`.

## Environment variables

The app builds and runs without these. With both unset, it runs in local demo mode.

| Name | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Optional | Supabase project URL. Turns on accounts and sync. |
| `VITE_SUPABASE_ANON_KEY` | Optional | Supabase anon public key. Never use the service-role key here. |

Copy `.env.example` to `.env.local` for local use. On Vercel, add both variables for Production and Preview, then redeploy.

## Supabase setup

1. Create a Supabase project. The free tier is enough.
2. Apply each migration in `supabase/migrations/` in filename order. Use the SQL editor, or run `supabase link --project-ref <your-project-ref>` and then `supabase db push`. The migrations create `profiles`, `budget_settings` and `spending_entries` with Row Level Security. Each user can access only rows where `auth.uid() = user_id`.
3. Turn on the Email provider under Authentication, Providers. Add `http://localhost:5173` and your production domain to the redirect allow list.
4. Put the project URL and anon key from Project Settings, API into `.env.local`. Restart `npm run dev`. You now get a sign-in screen, and your budget and spending sync to Postgres.

`src/lib/supabase.ts` creates the client only when both variables exist. `src/lib/repository.ts` picks `LocalRepository` (localStorage) or `SupabaseRepository` (Postgres) at runtime. The math module is the same in both modes.

## Data and privacy

In local demo mode, the browser stores all data under the `girl-math:v1` key. The app sends nothing anywhere. Clearing site data or using "Reset all data" deletes it. Use "Download backup" before you clear data or change devices.

In Supabase mode, your budget settings and spending entries go to your own Supabase Postgres database. Row Level Security scopes them to your account, so no other user can read or write your rows. The signed-in device caches the last successful sync for read-only recovery during an outage. The app shows a warning when it uses this cache.

## Layout

```
src/lib/mathEngine.ts      carryover math (pure, tested)
src/lib/repository.ts      local and Supabase storage
src/lib/storage.ts         localStorage helpers
src/lib/backup.ts          JSON backup, restore and CSV export
src/lib/auth.tsx           magic-link sign-in
src/lib/supabase.ts        Supabase client (only when configured)
src/components/            dashboard, logging, history, chart, settings, onboarding, sign-in
supabase/migrations/       database schema and RLS policies
public/                    manifest, icon, service worker
```

Built with Vite, React, TypeScript and Tailwind CSS. The bar chart is hand-written SVG with no chart library.
