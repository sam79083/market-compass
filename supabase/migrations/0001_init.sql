create table if not exists observations (
  id serial primary key,
  indicator_id text not null,
  period_date date not null,
  effective_date date not null,
  value double precision not null,
  is_estimate boolean not null default false,
  source text not null default '',
  meta jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  constraint uq_observation_indicator_period unique (indicator_id, period_date)
);

create index if not exists ix_observations_indicator_period
  on observations (indicator_id, period_date);
create index if not exists ix_observations_effective
  on observations (effective_date);

create table if not exists component_scores (
  id serial primary key,
  score_date date not null,
  indicator_id text not null,
  raw_value double precision,
  percentile double precision,
  score double precision,
  window_years_used double precision,
  observations_used integer,
  effective_date date,
  quality text not null default 'ok',
  meta jsonb not null default '{}'::jsonb,
  constraint uq_component_score_date_indicator unique (score_date, indicator_id)
);

create index if not exists ix_component_scores_indicator_date
  on component_scores (indicator_id, score_date);

create table if not exists category_scores (
  id serial primary key,
  score_date date not null,
  category text not null,
  score double precision,
  coverage double precision not null default 0,
  components jsonb not null default '{}'::jsonb,
  constraint uq_category_score_date unique (score_date, category)
);

create table if not exists composite_scores (
  score_date date primary key,
  score double precision,
  classification text not null default 'unavailable',
  coverage double precision not null default 0,
  confidence text not null default 'low',
  categories jsonb not null default '{}'::jsonb,
  components jsonb not null default '{}'::jsonb,
  explanation jsonb not null default '{}'::jsonb,
  weights_hash text not null default '',
  computed_at timestamptz not null default now()
);

create table if not exists ingest_runs (
  id serial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  message text not null default '',
  results jsonb not null default '[]'::jsonb
);

alter table observations enable row level security;
alter table component_scores enable row level security;
alter table category_scores enable row level security;
alter table composite_scores enable row level security;
alter table ingest_runs enable row level security;

-- The dashboard API connects with the database owner/service role and bypasses RLS.
-- No anonymous policies are created: the browser never receives database credentials.
