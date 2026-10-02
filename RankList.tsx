'use client';
import { useMemo, useState } from 'react';
import type { RankItem } from '@/lib/rank';
import { amountLabel, unitYen, yen } from '@/lib/units';
import { useConditions } from './ConditionsProvider';
import { usePurchases } from '@/lib/purchases';
import Link from 'next/link';

type Shop = 'all' | 'rakuten' | 'yahoo';
const LABEL = { rakuten: '楽天市場', yahoo: 'Yahoo!ショッピング' } as const;

export default function RankList({
  slug, items, base, baseLabel, bands,
}: { slug: string; items: RankItem[]; base: number; baseLabel: string; bands: { label: string; min: number; max: number }[] }) {
  const { add } = usePurchases();
  const [bought, setBought] = useState<Record<string, boolean>>({});
  const [reported, setReported] = useState<Record<string, boolean>>({});
  const { conditions, openSheet } = useConditions();
  const [shop, setShop] = useState<Shop>('all');
  const [band, setBand] = useState(-1);

  const rows = useMemo(() => {
    return items
      .filter((i) => shop === 'all' || i.source === shop)
      .filter((i) => band < 0 || (i.total >= bands[band].min && i.total < bands[band].max))
      .map((i) => {
        const pagePt = (i.price * i.pointPct) / 100 + i.pointAmount;
        const extraPt = (i.price * (conditions[i.source] || 0)) / 100;
        const eff = i.price - pagePt - extraPt;
        return { i, pagePt, extraPt, eff, per: eff / i.total };
      })
      .sort((a, b) => a.per - b.per);
  }, [items, shop, band, bands, conditions]);

  const best = rows[0]?.per ?? 0;
  const extras = (['rakuten', 'yahoo'] as const).filter((k) => conditions[k]).map((k) => `${k === 'rakuten' ? '楽天' : 'Yahoo!'}+${conditions[k]}%`);

  return (
    <div>
      <p className="condline">
        {extras.length ? `あなたの上乗せ（${extras.join('、')}）込みで並べています` : '商品ページのポイントだけで並べています'}
        <button type="button" className="linkbtn" onClick={openSheet}>{extras.length ? '変更' : '上乗せを設定'}</button>
      </p>
      <div className="filters">
        <div className="seg" role="group" aria-label="ショップで絞り込み">
          {(['all', 'rakuten', 'yahoo'] as Shop[]).map((f) => (
            <button key={f} type="button" aria-pressed={shop === f} onClick={() => setShop(f)}>
              {f === 'all' ? 'すべて' : f === 'rakuten' ? '楽天' : 'Yahoo!'}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="1回に買う量で絞り込み">
          <button type="button" aria-pressed={band < 0} onClick={() => setBand(-1)}>全量</button>
          {bands.map((b, k) => (
            <button key={b.label} type="button" aria-pressed={band === k} onClick={() => setBand(k)}>{b.label}</button>
          ))}
        </div>
      </div>

      {rows.length >= 2 && (
        <p className="verdict">
          いまの条件では1位が2位より<b>{((rows[1].per / best - 1) * 100).toFixed(1)}%</b>安く、1回の支払いは{yen(rows[0].i.price)}円（{amountLabel(rows[0].i.total, rows[0].i.fam, rows[0].i.unit)}）です。まとめ買いが多すぎるときは、上の「量」で絞り込めます。
        </p>
      )}

      <ol className="rank">
        {rows.map((r, k) => (
          <li key={r.i.id} className={`tag withimg${k === 0 ? ' best' : ''}`}>
            <span className="pos num">{k + 1}</span>
            {r.i.image && <img className="thumb" src={r.i.image} alt="" loading="lazy" width={64} height={64} />}
            <div className="tagbody">
              <span className="nm">{k === 0 && <span className="stamp">最安</span>}{r.i.name}</span>
              <div className="big">
                <b className="num">{unitYen(r.per * base)}</b><small>円 / {baseLabel}</small>
                {k > 0 && <span className="diff">+{((r.per / best - 1) * 100).toFixed(1)}%</span>}
              </div>
              <div className="facts">
                <span>支払い <b>{yen(r.i.price)}円</b>（送料無料）</span>
                <span>ポイント <b>{yen(r.pagePt + r.extraPt)}pt</b>{r.extraPt > 0 && `（うち上乗せ${yen(r.extraPt)}）`}</span>
                <span>量 <b>{amountLabel(r.i.total, r.i.fam, r.i.unit)}</b></span>
              </div>
              <p className="basis">
                読み取り：{r.i.size}{r.i.unit}{r.i.qty > 1 ? ` × ${r.i.qty}` : ''}
                {r.i.basis === 'rule+ai' && '（AIでも確認）'}
                {r.i.basis === 'ai' && '（AIが読み取り）'}
                {reported[r.i.id] ? <span className="okmsg">報告ありがとうございます</span> : (
                  <button type="button" className="linkbtn" onClick={() => {
                    fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: slug, title: r.i.name, parsed: `${r.i.size}${r.i.unit}x${r.i.qty}` }) }).catch(() => {});
                    setReported((x) => ({ ...x, [r.i.id]: true }));
                  }}>違う？</button>
                )}
              </p>
              <div className="shopline">
                <span className="muted small">{LABEL[r.i.source]}／{r.i.shop}</span>
                {bought[r.i.id] ? (
                  <Link href="/my" className="boughtlink">記録しました</Link>
                ) : (
                  <button type="button" className="linkbtn" onClick={() => {
                    add({ key: slug, label: r.i.name.slice(0, 80), shop: `${r.i.source === 'rakuten' ? '楽天' : 'Yahoo!'}／${r.i.shop}`, price: r.i.price, total: r.i.total, per: r.per, perPage: (r.i.price - r.pagePt) / r.i.total, fam: r.i.fam, unit: r.i.unit });
                    setBought((b) => ({ ...b, [r.i.id]: true }));
                  }}>これを買った</button>
                )}
                <a className="go" href={r.i.href} target="_blank" rel={r.i.sponsored ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}>
                  {r.i.source === 'rakuten' ? '楽天で見る' : 'Yahoo!で見る'}
                </a>
              </div>
            </div>
          </li>
        ))}
      </ol>
      {rows.length === 0 && <p className="empty">この条件に合う商品はありません。絞り込みを外してみてください。</p>}
    </div>
  );
}
