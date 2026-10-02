'use client';
import PriceChart from './PriceChart';
import { usePurchases, todayJst, daysBetween } from '@/lib/purchases';
import { unitYen } from '@/lib/units';
import type { DailyStat } from '@/lib/history';

export default function CategoryHistory({
  slug, history, todayStat, base, baseLabel,
}: { slug: string; history: DailyStat[]; todayStat: { min: number; median: number } | null; base: number; baseLabel: string }) {
  const { list } = usePurchases();
  const today = todayJst();
  const merged = [...history];
  if (todayStat && !merged.some((h) => h.date === today)) merged.push({ date: today, min: todayStat.min, median: todayStat.median, count: 0 });
  const market = merged.map((h) => ({ date: h.date, min: h.min * base, median: h.median * base }));
  const mine = list.filter((p) => p.key === slug);
  const points = mine.map((p) => ({ date: p.date, value: p.perPage * base, label: p.shop }));

  // 過去30日と比べた今日の位置
  const recent = merged.filter((h) => daysBetween(h.date, today) < 30);
  const now = todayStat?.min;
  let insight = '';
  if (now && recent.length >= 7) {
    const lowest = Math.min(...recent.map((h) => h.min));
    const avg = recent.reduce((a, h) => a + h.min, 0) / recent.length;
    insight = now <= lowest * 1.001
      ? '今日の最安は、過去30日でいちばん安い水準です。'
      : `今日の最安は、過去30日の平均より${Math.abs((now / avg - 1) * 100).toFixed(1)}%${now < avg ? '安い' : '高い'}水準です（30日の最安は${unitYen(lowest * base)}円）。`;
  } else if (recent.length < 7) {
    insight = `記録をはじめて${recent.length}日目です。1週間分たまると、今日の価格が安いかどうかを判定します。`;
  }
  const last = mine[mine.length - 1];

  return (
    <section aria-labelledby="h-hist">
      <h2 id="h-hist">最安と相場の推移</h2>
      {insight && <p className="small">{insight}</p>}
      {last && now && (
        <p className="small">
          前回あなたが買ったのは{daysBetween(last.date, today)}日前、{unitYen(last.perPage * base)}円 / {baseLabel}（今日の最安より
          {Math.abs((last.perPage / now - 1) * 100).toFixed(1)}%{last.perPage <= now ? '安い' : '高い'}）でした。
        </p>
      )}
      <PriceChart market={market} points={points} unitLabel={`円 / ${baseLabel}`} today={today} />
      <p className="muted small">線は商品ページのポイントだけで計算した値です。あなたの点も同じ基準で表示しています。</p>
    </section>
  );
}
