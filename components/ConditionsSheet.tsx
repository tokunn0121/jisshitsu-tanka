'use client';
import { useEffect, useRef, useState } from 'react';
import type { Conditions } from '@/lib/conditions';

type ShopKey = 'rakuten' | 'yahoo' | 'amazon';
const ROWS: { key: ShopKey; title: string; hint: string; presets: number[] }[] = [
  {
    key: 'rakuten',
    title: '楽天市場',
    hint: '楽天カード払いやSPUなどで、商品ページの倍率とは別に上乗せされる分',
    presets: [0, 1, 3, 6],
  },
  { key: 'yahoo', title: 'Yahoo!ショッピング', hint: 'PayPay払いやLYP会員などで上乗せされる分', presets: [0, 1, 3, 5] },
  { key: 'amazon', title: 'Amazon', hint: 'Amazonカード払いなどで上乗せされる分', presets: [0, 1, 1.5, 2] },
];

export default function ConditionsSheet({
  initial,
  onClose,
  onSave,
}: {
  initial: Conditions;
  onClose: () => void;
  onSave: (c: Conditions) => void;
}) {
  const [c, setC] = useState<Conditions>(initial);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog ref={ref} className="sheet" onClose={onClose} aria-labelledby="sheet-title">
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(c);
        }}
      >
        <h2 id="sheet-title">いつもの上乗せポイント</h2>
        <p className="muted small">
          商品ページには出てこないけれど、いつもの支払い方法で必ず付く分を入れておくと、ランキングもツールもあなたの条件で計算されます。わからなければ0のままで大丈夫です。
        </p>
        {ROWS.map((r) => (
          <fieldset key={r.key} className="cond">
            <legend>{r.title}</legend>
            <p className="muted small">{r.hint}</p>
            <div className="chips" role="group" aria-label={`${r.title}の上乗せ`}>
              {r.presets.map((p) => (
                <button
                  type="button"
                  key={p}
                  className="chipbtn"
                  aria-pressed={c[r.key] === p}
                  onClick={() => setC({ ...c, [r.key]: p })}
                >
                  {p === 0 ? 'なし' : `+${p}%`}
                </button>
              ))}
              <label className="custom">
                <span className="sr">{r.title}の上乗せ（%）</span>
                <input
                  inputMode="decimal"
                  value={String(c[r.key])}
                  onChange={(e) => setC({ ...c, [r.key]: parseFloat(e.target.value) || 0 })}
                />
                %
              </label>
            </div>
          </fieldset>
        ))}
        <div className="sheetacts">
          <button type="button" className="btn ghost" onClick={onClose}>
            閉じる
          </button>
          <button type="submit" className="btn primary">
            この条件で計算する
          </button>
        </div>
      </form>
    </dialog>
  );
}
