# Market Compass

A transparent, point-in-time valuation dashboard for the U.S. stock market.

Market Compass combines ten indicators across four categories into a single 0–100
composite score, shows the history of that score, and explains exactly how every
number was produced. It is a research and education tool, not investment advice.

- **Backend:** FastAPI, SQLAlchemy 2, pandas, SQLite locally / PostgreSQL (Supabase) in production
- **Frontend:** React 19, TypeScript, Vite, Apache ECharts
- **Deploy:** GitHub Actions refreshes data daily and exports static JSON; Cloudflare Pages (free, commercial-friendly) or Vercel Hobby (personal only) serves the site. A Render Blueprint is included for the live-API variant.

## What it shows

| Section | Indicator | Weight | Source |
| --- | --- | --- | --- |
| Fundamental valuation | Shiller CAPE | 0.6 | Robert Shiller / shillerdata.com |
| Fundamental valuation | Forward P/E (optional) | 0.4 | Licensed CSV feed |
| Fundamental valuation | Market cap / GDP (supplementary) | 0.0 | World Bank |
| Relative attractiveness | Equity risk premium | 1.0 | Shiller earnings yield − 10Y Treasury |
| Sentiment & momentum | Fear & Greed (optional) | 0.3 | Licensed CSV feed |
| Sentiment & momentum | VIX | 0.25 | Cboe |
| Sentiment & momentum | RSI (14-day) | 0.2 | S&P 500 prices |
| Sentiment & momentum | 200-day moving-average deviation | 0.25 | S&P 500 prices |
| Breadth | Share above 200-day average | 0.5 | Index constituents |
| Breadth | Equal-weight vs cap-weight relative | 0.5 | RSP / SPY |

Category weights: fundamental 50%, relative 20%, sentiment 20%, breadth 10%.
Scores use a 20-year rolling percentile window; a low score means "expensive".
Bands are 0–20 Very Overvalued, 20–40 Overvalued, 40–60 Neutral, 60–80
Undervalued, 80–100 Very Undervalued.

When an optional feed is not configured, the indicator is marked unavailable,
excluded from the weighted average, and disclosed in the UI. The dashboard
requires at least 60% component coverage and two categories before publishing a
composite score; otherwise it returns "Insufficient data".

## Quick start

### 1. Backend

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements-dev.txt
Copy-Item backend\.env.example backend\.env

cd backend
python -m app.cli init-db
python -m app.cli refresh --validate
python -m app.cli export-static
uvicorn app.main:app --reload --port 8000
```

`export-static` writes JSON snapshots to `frontend/public/data` for the static
deployment. Skip it if you only want the live API.

API docs: http://localhost:8000/docs

The first refresh downloads several years of daily prices and the full Shiller
workbook, so it can take a few minutes. Subsequent runs reuse stored history.

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to `http://localhost:8000`.
Set `VITE_API_URL` to point at a different API origin. Production builds default
to static snapshots when `VITE_API_URL` is unset; set `VITE_DATA_MODE=api` to
force the live API instead.

### Windows note

If the project path contains `&`, npm's generated `.bin` shims cannot be invoked
through `cmd.exe`. The package scripts therefore call Vite and TypeScript through
`node` directly, which works on every platform.

## CLI

Run from `backend/`:

```text
python -m app.cli init-db                              Create tables
python -m app.cli refresh [--no-breadth] [--validate]  Ingest, score, optionally validate
python -m app.cli score                                Recompute scores from stored observations
python -m app.cli validate                             Write app/data/validation.json
python -m app.cli export-static [--out DIR]            Write JSON snapshots (default frontend/public/data)
python -m app.cli import-csv --indicator forward_pe --file pe.csv
python -m app.cli import-csv --indicator fear_greed --file fg.csv --skip-score
```

CSV format: `date,value[,release_date][,is_estimate][,earnings_basis]`.
Dates are ISO `YYYY-MM-DD`. `earnings_basis` accepts `operating` or `reported`
for forward P/E.

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/health` | Service and database health |
| `GET /api/dashboard` | Latest composite, categories, indicators, bands, freshness |
| `GET /api/indicators/{id}/history?range=1y\|3y\|5y\|10y\|max` | Indicator observations and scores |
| `GET /api/composite/history?range=...` | Point-in-time composite history |
| `GET /api/methodology` | Weights, thresholds, formulas, data sources, limitations |
| `GET /api/validation` | Forward-return correlations and window sensitivity (may be null before first validation run) |

In static mode the frontend reads pre-generated files instead:
`/data/dashboard.json`, `/data/composite-history.json`,
`/data/indicators/{id}.json`, `/data/methodology.json`, and
`/data/validation.json`.

## Point-in-time correctness

Every observation stores both an observation date and an `effective_date` (when
the value became knowable). Lags are configured in `backend/config/weights.json`:

- CAPE: 30 days
- Forward P/E: 45 days
- Market cap / GDP: 270 days
- Monthly and daily market data: available same day

Scores at date *t* only use observations with `effective_date <= t`. This avoids
look-ahead bias in the historical composite series. Latest values that are still
inside their publication lag are shown as preliminary estimates and excluded from
the current score.

## Validation

`python -m app.cli validate` measures:

- Forward 3-month, 1-year, 3-year, and 5-year S&P 500 returns after each score
- Spearman rank correlations between scores and subsequent returns
- Results for the composite and for CAPE alone
- Out-of-sample split before/after 2015
- Sensitivity to 10/15/20/30-year percentile windows
- Coverage and confidence distributions

The output is written to `backend/app/data/validation.json` and served at
`/api/validation`. It is descriptive, not a trading backtest: overlapping return
windows are not independent, and historical data uses current-vintage series.

## Known limitations

- **Forward P/E and Fear & Greed** require licensed feeds. Without them the
  dashboard runs on 7–8 available components and labels the result accordingly.
- **Equity risk premium** falls back to a trailing-earnings proxy when no licensed
  forward P/E is available. The flag `erp_proxy` is shown in the UI.
- **Breadth** uses the current index constituent list for all history, which
  introduces survivorship bias. The flag `breadth_survivorship` is shown.
- **Market cap / GDP** is a slow annual proxy with a long publication lag and zero
  weight by default.
- **Prices** come from Yahoo Finance's unofficial chart interface. Review the
  provider's terms before any public or commercial deployment; set
  `ALLOW_UNOFFICIAL_PRICE_FEED=false` to disable it.
- Shiller data uses current-vintage history, so revisions are not reflected.
- Percentile windows shorter than the configured default are flagged
  (`short_percentile_window`) and reduce confidence.

## Deployment

### Cloudflare Pages (recommended if you add ads)

Cloudflare Pages' free plan allows commercial use and does not charge for static
requests or bandwidth. The limits that matter are 500 builds/month, 20,000 files,
and 25 MiB per file. This project uses about 15 files and a 3.4 MiB maximum, so
it fits comfortably.

1. Push the repository to GitHub.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages →
   Connect to Git**, and select the repository.
3. Set **Root directory** to `frontend`, framework preset **Vite**, build command
   `npm run build`, and build output directory `dist`.
4. Set `NODE_VERSION=22` if the default Node version is older.
5. Deploy. The daily GitHub Actions workflow commits fresh snapshots, and each
   commit triggers a new Pages build (about 22–30 builds/month, well under 500).
6. Add a custom domain under **Custom domains**; TLS is automatic. Ad networks
   generally expect a domain you own rather than `*.pages.dev`.

Direct-upload alternative: run `npm run build`, then
`npx wrangler pages deploy dist --project-name market-compass`, or drag `dist`
into the Pages dashboard. Direct uploads do not refresh automatically.

### Vercel (personal, non-commercial)

**Vercel Hobby prohibits commercial use, including ads.** Use Cloudflare Pages if
you plan to monetize. For a personal, ad-free project, Vercel works well.

This path needs no database and no long-running server. GitHub Actions performs
the refresh and commits JSON snapshots; Vercel serves them as static files.

**Fastest path (no Git): Vercel Drop**

1. From `frontend/`, run `npm run build`. This writes the site and the JSON
   snapshots to `frontend/dist`.
2. Open https://vercel.com/drop and drag the **`frontend/dist` folder** (not the
   repository root) onto the page.
3. Deploy. The site works immediately.

Vercel Drop has no Git connection, so it will not refresh automatically. To
update it, run `python -m app.cli refresh --validate` and
`python -m app.cli export-static` from `backend/`, then `npm run build` from
`frontend/`, and drop `dist` again. Connect the project to Git for automatic
deploys. Dropping the `frontend` source folder also works because Vercel detects
Vite, but it uploads more files and takes longer; dropping `dist` is the simplest
option.

**Automatic path (Git):**

1. Push this repository to GitHub. The committed `frontend/public/data` snapshot
   makes the first deploy work immediately.
2. In Vercel, import the repository, set **Root Directory** to `frontend`, and
   keep the detected Vite settings (`vercel.json` pins the build and output).
3. Open the **Actions** tab and run **Refresh market data** once manually. The
   workflow refreshes the data, writes snapshots, and commits them; Vercel
   redeploys on the new commit.
4. Optional: add `FORWARD_PE_CSV_URL` and `FEAR_GREED_CSV_URL` as repository
   Actions secrets to include licensed indicators.
5. The workflow runs at 22:30 UTC on weekdays and can be triggered manually.
   It needs `contents: write`; if branch protection blocks the bot, allow GitHub
   Actions to push or use a personal access token.

Notes:

- Vercel Hobby is for **personal, non-commercial** projects only. This setup
  uses static hosting, not Vercel Functions or Vercel Cron, so the 300-second
  function limit and once-per-day cron limit do not apply. The free tier includes
  100 GB of transfer per month.
- Each refresh commits roughly 12 MB of snapshots on the first run; later commits
  contain small deltas because only the newest observations change. If you want
  zero data commits, deploy from Actions with the Vercel CLI and a
  `VERCEL_TOKEN` instead of relying on Git integration.
- Scheduled GitHub Actions may be delayed, and are disabled after 60 days of
  repository inactivity. This workflow's own commits count as activity.

### Live API variant (optional)

The FastAPI service can run against SQLite or PostgreSQL (Supabase) when you want
live endpoints instead of static snapshots.

**Database (Supabase):**

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor. It creates the
   observation, score, and ingest-run tables and enables row-level security with
   no anonymous policies. The backend connects with the service/database role.
3. Copy the session-pooler connection string and append `?sslmode=require`.

**Render:**

1. In Render, create a Blueprint from `render.yaml`.
2. Set `DATABASE_URL` and `CORS_ORIGINS` on both `valuation-api` and
   `valuation-refresh` (mark them as secrets). `CORS_ORIGINS` is the dashboard's
   public URL.
3. Optionally set `FORWARD_PE_CSV_URL` and `FEAR_GREED_CSV_URL`.
4. Deploy. The static site receives the API host through `VITE_API_URL`
   automatically.

The cron refreshes data, recomputes scores, and regenerates the validation
payload. A cold database is populated on the first run. Check Render's current
pricing for cron and instance limits; the static path avoids those costs.

### Static host alternatives

The production build is plain static files (`frontend/dist`), so the backend does
not need to be deployed. The refresh workflow is host-agnostic: it only updates
`frontend/public/data`, and any Git-connected static host can build it.

| Host | Free static hosting | Notes |
| --- | --- | --- |
| Cloudflare Pages | 500 builds/month, unlimited static requests, 25 MiB per file | Recommended for ads/commercial; no bandwidth charge |
| Vercel Hobby | 100 GB transfer/month, 100 deployments/day | No ads or commercial use |
| Render static | 5 GB bandwidth/month, 500 build minutes/month | Hobby is for personal projects; free web services spin down and cron is not free |
| GitHub Pages | ~100 GB/month soft limit, 1 GB site size | Free accounts require a public repository; not for commercial/business use |

### If you add ads

- Start with Google AdSense. Approval needs a real domain, crawlable content, a
  privacy policy, and a certified consent banner for EEA/UK traffic. A
  client-rendered dashboard may be rejected, so add crawlable About, Methodology,
  and FAQ pages rather than keeping everything inside modals.
- Add an `ads.txt` file with your publisher ID, keep ads below the fold, and
  never click your own ads.
- Hosting stays free on Cloudflare Pages as traffic grows. The real upgrade
  thresholds are set by the ad network (AdSense, Ezoic, Mediavine, Raptive), not
  by hosting.
- Ad income is taxable and payouts usually start after a minimum threshold; treat
  it as pocket money, not a revenue plan.

### Docker

```powershell
docker build -t market-compass-api backend
docker run -p 8000:8000 -e DATABASE_URL=sqlite:///./data/valuation.db market-compass-api
```

## Development

```powershell
cd backend
python -m pytest
python -m ruff check app tests
```

```powershell
cd frontend
npm run typecheck
npm run build
```

## Project structure

```text
backend/
  app/
    ingestion/      Source clients and refresh pipeline
    scoring/        Percentiles, composite scoring, validation
    services/       Dashboard, history, and methodology payloads
    static_export.py  JSON snapshot exporter for static hosting
    api.py          FastAPI routes
    cli.py          Operational commands
    models.py       SQLAlchemy schema
  config/weights.json
  tests/
frontend/
  public/data/      Generated JSON snapshots (committed)
  src/
    components/     Dial, cards, charts, modals, states
    charts.ts       ECharts option builders
    App.tsx         Dashboard layout
  vercel.json
.github/workflows/refresh.yml
supabase/migrations/0001_init.sql
render.yaml
```

## Disclaimer

Market Compass is provided for research and educational purposes only. It does
not constitute investment advice, an offer, or a solicitation. Valuation metrics
can remain extreme for long periods, and historical relationships may not persist.
Always do your own research.
