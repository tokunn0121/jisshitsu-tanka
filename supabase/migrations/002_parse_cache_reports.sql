-- AIで読み取った結果のキャッシュ（同じ商品名を毎日AIに送らないため）
create table if not exists public.parse_cache (
  title      text primary key,
  result     jsonb not null,
  model      text,
  created_at timestamptz not null default now()
);
alter table public.parse_cache enable row level security; -- サーバー（service role）だけが読み書きする

-- 利用者からの「読み取りが違う」報告
create table if not exists public.parse_reports (
  id         bigint generated always as identity primary key,
  category   text,
  title      text not null,
  parsed     text,
  created_at timestamptz not null default now()
);
alter table public.parse_reports enable row level security;
