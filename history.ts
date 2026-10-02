// 毎日のスナップショットをSupabase（PostgREST）に保存・取得する
export type DailyStat = { date: string; min: number; median: number; count: number; bestName?: string; bestShop?: string };

const url = () => process.env.SUPABASE_URL?.replace(/\/$/, '');

export function jstDate(d = new Date()): string {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function getHistory(category: string, days = 90): Promise<DailyStat[]> {
  const base = url();
  const key = process.env.SUPABASE_ANON_KEY;
  if (!base || !key) return [];
  const since = jstDate(new Date(Date.now() - days * 86400 * 1000));
  const q = new URLSearchParams({
    select: 'date,min_per,median_per,count,best_name,best_shop',
    category: `eq.${category}`,
    date: `gte.${since}`,
    order: 'date.asc',
  });
  try {
    const res = await fetch(`${base}/rest/v1/daily_stats?${q}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const rows: any[] = await res.json();
    return rows.map((r) => ({
      date: r.date,
      min: Number(r.min_per),
      median: Number(r.median_per),
      count: r.count,
      bestName: r.best_name ?? undefined,
      bestShop: r.best_shop ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function saveSnapshots(rows: Record<string, unknown>[]): Promise<{ ok: boolean; status: number; body: string }> {
  const base = url();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return { ok: false, status: 0, body: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です' };
  const res = await fetch(`${base}/rest/v1/daily_stats?on_conflict=category,date`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
    cache: 'no-store',
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}
