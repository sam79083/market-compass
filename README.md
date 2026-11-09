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
| Fundamental valuation | Forward P/E (optional) | 0.4 | FactSet Earnings Insight (weekly) |
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

## S&P 500 and NASDAQ views

The dashboard has two views. Each reads its own stored series, so the numbers differ.

| Indicator | S&P 500 view | NASDAQ view |
| --- | --- | --- |
| RSI, 200-day deviation | `^GSPC` | `^IXIC` |
| Volatility | VIX | VXN (`^VXN`) |
| Equal-weight vs cap-weight | RSP / SPY | QQEW / QQQ |
| Fear & Greed | CNN (market-wide) | same series, shown in both |
| Market cap / GDP | World Bank (whole U.S. market) | same series, shown in both |
| Constituent breadth | current S&P 500 members | current NASDAQ-100 members (`backend/app/data/nasdaq100_constituents.csv`, or `NASDAQ_CONSTITUENTS_URL`) |
| Equity risk premium | Shiller earnings yield - 10Y | NASDAQ-100 trailing earnings yield (daily QQQ P/E snapshot, `data/nasdaq_pe.csv`) - 10Y |
| CAPE, forward P/E | available | **unavailable** (S&P 500-only sources) |

Indicators with no NASDAQ source are reported as unavailable rather than reusing S&P 500
numbers. No free source publishes NASDAQ-100 earnings *history*, so the NASDAQ equity risk
premium starts on the first day `scripts/fetch_nasdaq_pe.py` ran and adds one point per
trading day. It is shown immediately, but it is scored only after `minimum_observations.erp`
(504 daily points, about two years, in `backend/config/weights.json`) exist. Until then NASDAQ
coverage stays below the 60% minimum, so the NASDAQ composite is withheld ("Insufficient
data") while the other panels show. The NASDAQ-100 list is reconstituted by Nasdaq every
December; refresh the CSV then (breadth skips any symbol Yahoo can't price).

`export-static` writes `dashboard.sp500.json`, `dashboard.nasdaq.json`,
`composite-history.nasdaq.json` and `indicators/nasdaq/*.json` next to the S&P 500 files.
The API takes `?index=sp500|nasdaq` on `/api/dashboard`, `/api/composite/history` and
`/api/indicators/{id}/history`.

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
for forward P/E. Do not add a `ticker` column: when present, only rows whose
ticker equals the indicator id (`forward_pe`) are kept.

### Forward P/E automation

The refresh workflow runs `scripts/fetch_forward_pe.py`, which reads the forward
12-month P/E from FactSet's weekly Earnings Insight PDF and appends it to
`data/forward_pe.csv` (`date,value,release_date`). The workflow commits that file
with the refreshed snapshots. Run it once with a backfill so percentile scores
have history: Actions → Refresh market data → Run workflow → set
`forward_pe_since` (for example `2019-01-01`). A `FORWARD_PE_CSV_URL` secret, if
set, overrides the fetched file.

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

- **Forward P/E** is read weekly from FactSet's free Earnings Insight report by
  `scripts/fetch_forward_pe.py` (run by the refresh workflow, stored in
  `data/forward_pe.csv`). It is rounded to one decimal, parsed from a PDF, and its
  history starts at the first fetched report unless you backfill (see below).
  Check FactSet's terms of use before redistributing the series.
- **Fear & Greed** requires an authorized feed. Without it the dashboard runs on
  the remaining components and labels the result accordingly.
- **Equity risk premium** falls back to a trailing-earnings proxy until forward
  P/E has at least 12 observations and the latest is under 120 days old. The flag
  `erp_proxy` is shown in the UI.
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

### Cloudflare Workers (static assets, recommended)

The repository includes `frontend/wrangler.jsonc`, which serves the Vite build
(`frontend/dist`) as static assets. Workers Builds installs dependencies, runs
the build, and deploys with Wrangler.

1. Push the repository to GitHub.
2. In Cloudflare, go to **Workers & Pages → Create → Workers → Connect to Git**
   and select the repository.
3. Set **Root directory** to `frontend`, **Build command** to `npm run build`,
   and keep **Deploy command** `npx wrangler deploy`. `frontend/.nvmrc` pins
   Node 22.
4. Deploy. The URL is `https://market-compass.<account>.workers.dev`.
5. Add a custom domain under the Worker's **Settings → Domains & Routes**.
   Workers custom domains require the domain's nameservers to be on Cloudflare;
   buying through Cloudflare Registrar is the simplest option. TLS is automatic.
6. Open **Actions → Refresh market data → Run workflow** once. The workflow
   commits fresh snapshots and triggers a new Workers build.

Workers Free includes 3,000 build minutes/month and 20,000 static files at
25 MiB each; static asset requests are free and unlimited. This project uses
about 21 files and a 3.4 MiB maximum.

### Cloudflare Pages (alternative)

Cloudflare Pages' free plan allows commercial use and does not charge for static
requests or bandwidth. The limits that matter are 500 builds/month, 20,000 files,
and 25 MiB per file.

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
| Cloudflare Workers | 3,000 build minutes/month, unlimited static requests, 20,000 files, 25 MiB per file | Recommended; custom domains require Cloudflare nameservers |
| Cloudflare Pages | 500 builds/month, unlimited static requests, 25 MiB per file | Commercial-friendly; custom domains can use external DNS |
| Vercel Hobby | 100 GB transfer/month, 100 deployments/day | No ads or commercial use |
| Render static | 5 GB bandwidth/month, 500 build minutes/month | Hobby is for personal projects; free web services spin down and cron is not free |
| GitHub Pages | ~100 GB/month soft limit, 1 GB site size | Free accounts require a public repository; not for commercial/business use |

### If you add ads

- The repository includes crawlable `/about`, `/methodology`, `/faq`, `/privacy`,
  and `/terms` pages, plus an optional ad slot below the indicator grid. The slot
  is hidden unless both `VITE_ADSENSE_CLIENT` and `VITE_ADSENSE_SLOT` are set as
  build variables. See `frontend/.env.example`.
- Replace the bracketed placeholders in `frontend/public/privacy.html` and
  `frontend/public/terms.html` (contact email, last-updated date, jurisdiction)
  and have the policy reviewed for your jurisdiction.
- After AdSense approval, rename `frontend/public/ads.txt.example` to `ads.txt`
  and replace `pub-XXXXXXXXXXXXXXXX` with your publisher ID. When
  `VITE_ADSENSE_CLIENT` is set, the build injects the AdSense account meta tag
  and loader into `index.html` automatically.
- In AdSense, enable a Google-certified consent management platform for EEA/UK
  traffic. The privacy page links to Google Ads Settings and industry opt-outs.
- Keep ads below the fold, never click your own ads, and do not place ads next to
  misleading claims.
- Hosting stays free on Cloudflare as traffic grows. The real upgrade thresholds
  are set by the ad network (AdSense, Ezoic, Mediavine, Raptive), not by hosting.
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
