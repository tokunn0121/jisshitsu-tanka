'use client';
import { useMemo, useState } from 'react';
import { unitYen } from '@/lib/units';

export type MarketPoint = { date: string; min: number; median: number };
export type MyPoint = { date: string; value: number; label: string };

const W = 340, H = 180, L = 44, R = 10, T = 12, B = 24;
const DAY = 86400000;
const md = (d: string) => `${+d.slice(5, 7)}/${+d.slice(8, 10)}`;
const toT = (d: string) => new Date(`${d}T00:00:00Z`).getTime();
const toD = (t: number) => new Date(t).toISOString().slice(0, 10);

export default function PriceChart({
  market, points, unitLabel, today, showRange = true,
}: { market: MarketPoint[]; points: MyPoint[]; unitLabel: string; today: string; showRange?: boolean }) {
  const [days, setDays] = useState<30 | 90>(30);
  const [hover, setHover] = useState<string | null>(null);

  const g = useMemo(() => {
    const end = toT(today);
    const start = end - (days - 1) * DAY;
    const m = market.filter((p) => toT(p.date) >= start && toT(p.date) <= end);
    const pts = points.filter((p) => toT(p.date) >= start && toT(p.date) <= end);
    const vals = [...m.flatMap((p) => [p.min, p.median]), ...pts.map((p) => p.value)];
    if (!vals.length) return null;
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < hi * 0.04) { lo -= hi * 0.04; hi += hi * 0.04; }
    const pad = (hi - lo) * 0.12;
    lo = Math.max(0, lo - pad); hi += pad;
    const x = (d: string) => L + ((toT(d) - start) / ((days - 1) * DAY)) * (W - L - R);
    const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const line = (key: 'min' | 'median') => m.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
    const ticks = [0, 0.5, 1].map((k) => lo + (hi - lo) * k);
    return { m, pts, x, y, line, ticks, start, end };
  }, [market, points, days, today]);

  const dates = useMemo(() => {
    if (!g) return [] as string[];
    return Array.from(new Set([...g.m.map((p) => p.date), ...g.pts.map((p) => p.date)])).sort();
  }, [g]);
  const focus = hover || dates[dates.length - 1] || null;
  const fm = g?.m.find((p) => p.date === focus);
  const fp = g?.pts.filter((p) => p.date === focus) || [];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!g || !dates.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = dates[0], dist = Infinity;
    for (const d of dates) { const dd = Math.abs(g.x(d) - px); if (dd < dist) { dist = dd; best = d; } }
    setHover(best);
  };

  return (
    <figure className="chart">
      <div className="chartbar">
        <ul className="legend" aria-hidden>
          <li><i className="lg-min" />最安</li>
          <li><i className="lg-med" />相場</li>
          {points.length > 0 && <li><i className="lg-me" />あなたの購入</li>}
        </ul>
        {showRange && (
          <div className="seg" role="group" aria-label="期間">
            {([30, 90] as const).map((d) => (
              <button key={d} type="button" aria-pressed={days === d} onClick={() => { setDays(d); setHover(null); }}>{d}日</button>
            ))}
          </div>
        )}
      </div>
      {!g ? (
        <p className="chartempty">記録がたまると、ここに推移が表示されます。最安と相場は毎朝6時ごろに記録しています。</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="chartsvg" role="img"
          aria-label={`過去${days}日の最安と相場の推移`} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          {g.ticks.map((v, i) => (
            <g key={i}>
              <line x1={L} x2={W - R} y1={g.y(v)} y2={g.y(v)} className="grid" />
              <text x={L - 6} y={g.y(v) + 4} textAnchor="end" className="axis">{unitYen(v)}</text>
            </g>
          ))}
          <text x={L} y={H - 6} className="axis">{md(toD(g.start))}</text>
          <text x={W - R} y={H - 6} textAnchor="end" className="axis">{md(toD(g.end))}</text>
          {focus && <line x1={g.x(focus)} x2={g.x(focus)} y1={T} y2={H - B} className="cursor" />}
          {g.m.length > 1 && <path d={g.line('median')} className="ln-med" />}
          {g.m.length > 1 && <path d={g.line('min')} className="ln-min" />}
          {g.m.length === 1 && (
            <>
              <circle cx={g.x(g.m[0].date)} cy={g.y(g.m[0].median)} r={3.5} className="dot-med" />
              <circle cx={g.x(g.m[0].date)} cy={g.y(g.m[0].min)} r={4} className="dot-min" />
            </>
          )}
          {g.pts.map((p, i) => <circle key={i} cx={g.x(p.date)} cy={g.y(p.value)} r={5.5} className="dot-me" />)}
        </svg>
      )}
      {focus && (fm || fp.length > 0) && (
        <figcaption className="chartcap">
          <b>{md(focus)}</b>
          {fm && <span>最安 <b className="num">{unitYen(fm.min)}</b>・相場 <b className="num">{unitYen(fm.median)}</b></span>}
          {fp.map((p, i) => <span key={i} className="me">あなた <b className="num">{unitYen(p.value)}</b>（{p.label}）</span>)}
          <span className="muted">{unitLabel}</span>
        </figcaption>
      )}
    </figure>
  );
}
