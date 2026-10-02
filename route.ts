import { NextResponse } from 'next/server';
import { CATEGORIES } from '@/lib/categories';
import { getRanking, rankStats } from '@/lib/rank';
import { jstDate, saveSnapshots } from '@/lib/history';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Vercel Cronから毎朝呼ばれ、各カテゴリの最安・相場を記録する
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const date = jstDate();
  const rows: Record<string, unknown>[] = [];
  for (const c of CATEGORIES) {
    const r = await getRanking(c.slug, { fresh: true });
    const s = r ? rankStats(r.items) : null;
    if (!r || !s || s.count < 3) continue;
    const best = r.items[0];
    rows.push({
      category: c.slug,
      date,
      min_per: s.min,
      median_per: s.median,
      count: s.count,
      best_name: best?.name.slice(0, 200),
      best_shop: best?.shop,
      best_source: best?.source,
    });
  }
  const saved = rows.length ? await saveSnapshots(rows) : { ok: true, status: 204, body: '' };
  return NextResponse.json({ date, categories: rows.map((r) => r.category), saved: saved.ok, status: saved.status, detail: saved.ok ? undefined : saved.body });
}
