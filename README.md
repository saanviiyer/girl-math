# Girl Math 💅

> Set a daily budget; unspent money rolls over into a growing surplus you can splurge with.


A daily-budget **carryover tracker**. Set a daily budget, log what you spend, and
every dollar you *don't* spend becomes surplus you can splurge with later —
guilt-free. It's just math.

> you didn't spend $11 today, so really you MADE $11.

Everything runs in the browser. No backend, no accounts — all data lives in
`localStorage`.

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
- History grouped by day with per-day net; edit or delete any entry.
- Settings to change the budget/currency (recomputes every day) or reset all data.
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

## Data & privacy

All data is stored locally in your browser under the `girl-math:v1` key. Clearing
site data (or the in-app **Reset all data** button) wipes it. Nothing is sent
anywhere.
