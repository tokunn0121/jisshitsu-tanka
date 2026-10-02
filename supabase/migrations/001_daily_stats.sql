-- カテゴリごとの毎日の「最安」と「相場（中央値）」。値は基準単位（1ml・1g・1個）あたりの円
create table if not exists public.daily_stats (
  category    text        not null,
  date        date        not null,
  min_per     numeric     not null,
  median_per  numeric     not null,
  count       integer     not null,
  best_name   text,
  best_shop   text,
  best_source text,
  created_at  timestamptz not null default now(),
  primary key (category, date)
);

alter table public.daily_stats enable row level security;

-- だれでも読める（書き込みはサーバー側のservice roleのみ）
drop policy if exists "daily_stats are public" on public.daily_stats;
create policy "daily_stats are public" on public.daily_stats for select using (true);
