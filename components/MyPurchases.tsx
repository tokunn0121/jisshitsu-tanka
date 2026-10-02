'use client';
import Link from 'next/link';
import PriceChart from './PriceChart';
import { usePurchases, todayJst, daysBetween, type Purchase } from '@/lib/purchases';
import { unitYen, yen } from '@/lib/units';
import type { DailyStat } from '@/lib/history';

type CatMeta = { slug: string; short: string; base: number; baseLabel: string };

function toolBase(p: Purchase): { base: number; label: string } {
  if (p.fam === 'vol') return { base: 100, label: '100ml' };
  if (p.fam === 'wt') return { base: 100, label: '100g' };
  return { base: 1, label: `1${p.unit}` };
}
function addDays(d: string, n: number): string {
  return new Date(new Date(`${d}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
}
const md = (d: string) => `${+d.slice(5, 7)}月${+d.slice(8, 10)}日`;

export default function MyPurchases({ cats, histories }: { cats: CatMeta[]; histories: Record<string, DailyStat[]> }) {
  const { list, remove, update } = usePurchases();
  const today = todayJst();

  if (!list.length) {
    return (
      <div className="empty">
        <p>まだ記録がありません。ランキングや比較ツールの値札にある「これを買った」を押すと、その日の単価がここに記録され、相場の推移と一緒にグラフで見られます。</p>
        <Link href="/rank" className="btn small">ランキングを見る</Link>
      </div>
    );
  }

  const groups = new Map<string, Purchase[]>();
  for (const p of list) groups.set(p.key, [...(groups.get(p.key) || []), p]);
  const ordered = [...groups.entries()].sort((a, b) => b[1][b[1].length - 1].date.localeCompare(a[1][a[1].length - 1].date));

  return (
    <div className="mygroups">
      {ordered.map(([key, ps]) => {
        const cat = cats.find((c) => c.slug === key);
        const isTool = key.startsWith('tool:');
        const title = cat ? cat.short : key.replace(/^tool:/, '');
        const tb = toolBase(ps[0]);
        const base = cat ? cat.base : tb.base;
        const baseLabel = cat ? cat.baseLabel : tb.label;
        const last = ps[ps.length - 1];
        const gaps = ps.slice(1).map((p, i) => daysBetween(ps[i].date, p.date)).filter((d) => d > 0);
        const avgGap = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
        const next = avgGap ? addDays(last.date, avgGap) : null;
        const market = cat ? (histories[cat.slug] || []).map((h) => ({ date: h.date, min: h.min * base, median: h.median * base })) : [];
        const points = ps.map((p) => ({ date: p.date, value: (cat ? p.perPage : p.per) * base, label: p.shop }));
        return (
          <section key={key} className="mygroup">
            <h2>{title}</h2>
            <p className="small">
              {ps.length}回記録・前回は{daysBetween(last.date, today)}日前
              {avgGap && <>・平均{avgGap}日ごとに購入。次の目安は<b>{md(next!)}</b>ごろです</>}
              {cat && <>（<Link href={`/rank/${cat.slug}`}>今日のランキング</Link>）</>}
            </p>
            <PriceChart market={market} points={points} unitLabel={`円 / ${baseLabel}${isTool ? '（上乗せ込み）' : ''}`} today={today} />
            <ul className="mylist">
              {[...ps].reverse().map((p) => (
                <li key={p.id}>
                  <input type="date" aria-label="買った日" value={p.date} max={today} onChange={(e) => e.target.value && update(p.id, { date: e.target.value })} />
                  <span className="mlabel">{p.label}<small className="muted">（{p.shop}）</small></span>
                  <span className="mval num">{unitYen((cat ? p.perPage : p.per) * base)}<small>円</small></span>
                  <span className="muted small">{yen(p.price)}円</span>
                  <button type="button" className="linkbtn danger" onClick={() => remove(p.id)}>削除</button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="muted small">この記録は、この端末のブラウザの中だけに保存されています。ほかの人には見えません。</p>
    </div>
  );
}
