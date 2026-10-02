'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { num, parseQty, parseQtyDetailed, detectShop, type Shop } from '@/lib/parse';
import { splitPaste } from '@/lib/paste';
import { UNITS, BASES, amountLabel, unitYen, yen } from '@/lib/units';
import { SHOP_LABEL, EXTRA_HINT } from '@/lib/conditions';
import { useConditions } from './ConditionsProvider';
import { usePurchases } from '@/lib/purchases';

type Item = {
  id: string; shop: Shop; name: string; url: string; price: string; ship: string; coupon: string;
  size: string; unit: string; qty: string; pt: string; ptUnit: 'pt' | '%'; extra: string; manual?: boolean;
};
type Saved = { name: string; items: Item[]; base: number };
type Store = { items: Item[]; saved: Saved[]; base: number };

const KEY = 'jt-tool-v1';
const PTPH: Record<Shop, string> = { amazon: '例 5', rakuten: '例 10', yahoo: '例 5', other: '' };
const PTHINT: Record<Shop, string> = { amazon: 'ページの「〇pt」をそのまま', rakuten: '「ポイント10倍」なら10と%', yahoo: '「+5%」なら5と%', other: 'ページの表示どおりに' };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const blank = (shop: Shop, unit = 'ml'): Item => ({
  id: uid(), shop, name: '', url: '', price: '', ship: '', coupon: '', size: '', unit, qty: '1',
  pt: '', ptUnit: shop === 'amazon' ? 'pt' : '%', extra: '',
});
const SAMPLE: Omit<Item, 'id'>[] = [
  { shop: 'amazon', name: 'ランドリン 柔軟剤 詰め替え クラシックフィオーレ 480ml', url: '', price: '548', ship: '', coupon: '', size: '480', unit: 'ml', qty: '1', pt: '5', ptUnit: 'pt', extra: '', manual: true },
  { shop: 'amazon', name: 'ランドリン 柔軟剤 詰め替え クラシックフィオーレ 960ml', url: '', price: '1043', ship: '', coupon: '', size: '960', unit: 'ml', qty: '1', pt: '10', ptUnit: 'pt', extra: '', manual: true },
  { shop: 'rakuten', name: 'ランドリン 柔軟剤 詰め替え 3倍サイズ 1440ml 3個セット', url: '', price: '4448', ship: '', coupon: '', size: '1440', unit: 'ml', qty: '3', pt: '1', ptUnit: '%', extra: '', manual: true },
];

function b64e(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64d(s: string) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export default function Tool({ defaultUnit = 'ml' }: { defaultUnit?: string }) {
  const { conditions, openSheet } = useConditions();
  const { add: addPurchase } = usePurchases();
  const [store, setStore] = useState<Store>({ items: [], saved: [], base: 100 });
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState('');
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [paste, setPaste] = useState('');
  const [saveName, setSaveName] = useState('');
  const focusId = useRef<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let s: Store | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) s = JSON.parse(raw);
    } catch {}
    const c = new URLSearchParams(window.location.search).get('c');
    if (c) {
      try {
        const shared = JSON.parse(b64d(c)) as Omit<Item, 'id'>[];
        s = { items: shared.map((x) => ({ ...blank(x.shop), ...x, id: uid(), manual: true })), saved: s?.saved || [], base: s?.base || 100 };
        setNotice('共有された比較を表示しています。');
        window.history.replaceState(null, '', window.location.pathname);
      } catch {}
    }
    if (s) setStore({ items: s.items || [], saved: s.saved || [], base: s.base || 100 });
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {}
    if (focusId.current) {
      const el = document.getElementById(`${focusId.current}-price`) as HTMLInputElement | null;
      if (el) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      focusId.current = null;
    }
  }, [store, loaded]);

  const extraOf = (it: Item) => (it.extra.trim() === '' ? conditions[it.shop] || 0 : num(it.extra));
  const calc = (it: Item) => {
    const price = num(it.price), size = num(it.size), qty = num(it.qty);
    if (price <= 0 || size <= 0 || qty <= 0) return null;
    const u = UNITS[it.unit] || UNITS.ml;
    const coupon = num(it.coupon), ship = num(it.ship);
    const paid = Math.max(price + ship - coupon, 0);
    const base = Math.max(price - coupon, 0);
    const pagePt = it.ptUnit === '%' ? (base * num(it.pt)) / 100 : num(it.pt);
    const extraPt = (base * extraOf(it)) / 100;
    const back = pagePt + extraPt;
    const total = size * u.f * qty;
    return { paid, back, pagePt, extraPt, eff: paid - back, total, fam: u.fam, per: (paid - back) / total, ship };
  };

  const update = (id: string, patch: Partial<Item>) =>
    setStore((s) => ({ ...s, items: s.items.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const onField = (it: Item, k: keyof Item, v: string) => {
    const patch: Partial<Item> = { [k]: v } as Partial<Item>;
    if (k === 'url') {
      const s = detectShop(v);
      if (s && s !== it.shop) { patch.shop = s; if (!num(it.pt)) patch.ptUnit = s === 'amazon' ? 'pt' : '%'; }
    }
    if (k === 'shop' && !num(it.pt)) patch.ptUnit = v === 'amazon' ? 'pt' : '%';
    if (k === 'size' || k === 'unit' || k === 'qty') patch.manual = true;
    if (k === 'name' && !it.manual) {
      const r = parseQty(v);
      if (r) Object.assign(patch, { size: String(r.size), unit: r.unit, qty: String(r.qty) });
    }
    update(it.id, patch);
  };

  const addFromPaste = () => {
    const text = paste.trim();
    if (!text) return;
    const { url, name, shop } = splitPaste(text);
    const it = blank(shop || 'other', defaultUnit);
    it.url = url;
    it.name = name;
    const r = name ? parseQtyDetailed(name) : null;
    if (r) Object.assign(it, { size: String(r.size), unit: r.unit, qty: String(r.qty) });
    setStore((s) => ({ ...s, items: [...s.items, it] }));
    setOpenMap((m) => ({ ...m, [it.id]: true }));
    focusId.current = it.id;
    setPaste('');
    setNotice(r ? `「${r.size}${r.unit}${r.qty > 1 ? `×${r.qty}` : ''}」と読み取りました。${r.confidence === 'low' ? '自信がないので、容量と個数を確認してください。' : '価格を入れてください。'}` : '容量を読み取れませんでした。価格と容量を入れてください。');
  };

  const rows = useMemo(
    () => store.items.map((it, i) => ({ it, i, c: calc(it) })).filter((r) => r.c) as { it: Item; i: number; c: NonNullable<ReturnType<typeof calc>> }[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.items, conditions],
  );
  const famCount: Record<string, number> = {};
  rows.forEach((r) => (famCount[r.c.fam] = (famCount[r.c.fam] || 0) + 1));
  const fam = Object.keys(famCount).sort((a, b) => famCount[b] - famCount[a])[0] as 'vol' | 'wt' | 'cnt' | undefined;
  const inRows = rows.filter((r) => r.c.fam === fam).sort((a, b) => a.c.per - b.c.per);
  const outRows = rows.filter((r) => r.c.fam !== fam);
  const baseOpts = fam && fam !== 'cnt' ? BASES[fam] : null;
  const base = baseOpts ? (baseOpts.some((b) => b[0] === store.base) ? store.base : 100) : 1;
  const baseName = baseOpts ? baseOpts.find((b) => b[0] === base)![1] : inRows[0] ? `1${inRows[0].it.unit}` : '';
  const best = inRows[0]?.c.per ?? 0;
  const label = (it: Item, i: number) => it.name.trim() || `${SHOP_LABEL[it.shop]}の商品 ${i + 1}`;
  const extras = (['rakuten', 'yahoo', 'amazon'] as const).filter((k) => conditions[k]).map((k) => `${SHOP_LABEL[k]}+${conditions[k]}%`);

  const share = async () => {
    const data = store.items.filter((x) => calc(x)).map(({ id, manual, ...rest }) => rest);
    const url = `${window.location.origin}/?c=${b64e(JSON.stringify(data))}`;
    try {
      if (navigator.share) await navigator.share({ title: '実質単価くらべ', url });
      else { await navigator.clipboard.writeText(url); setNotice('共有リンクをコピーしました。'); }
    } catch {}
  };

  return (
    <div className="tool" ref={topRef}>
      <form className="paste" onSubmit={(e) => { e.preventDefault(); addFromPaste(); }}>
        <label htmlFor="paste" className="pastelabel">商品名か商品ページのURLを貼る</label>
        <div className="pasterow">
          <input id="paste" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="例：ランドリン 詰め替え 1440ml 3個セット" enterKeyHint="done" />
          <button type="submit" className="btn primary" disabled={!paste.trim()}>追加</button>
        </div>
        <p className="pastehint">アプリの「共有」でコピーした文字をそのまま貼れます。容量・個数・ショップを自動で読み取ります。</p>
      </form>

      {notice && <p className="notice" role="status">{notice}</p>}

      <section aria-labelledby="t-rank" className="results">
        <div className="rowhead">
          <h2 id="t-rank">安い順</h2>
          {baseOpts && (
            <div className="seg" role="group" aria-label="表示単位">
              {baseOpts.map(([v, l]) => (
                <button key={v} type="button" aria-pressed={v === base} onClick={() => setStore((s) => ({ ...s, base: v }))}>{l}</button>
              ))}
            </div>
          )}
        </div>
        <p className="condline">
          {extras.length ? `あなたの上乗せ：${extras.join('、')}` : '上乗せポイントは未設定'}
          <button type="button" className="linkbtn" onClick={openSheet}>{extras.length ? '変更' : '設定する'}</button>
        </p>

        {inRows.length === 0 ? (
          <div className="empty">
            <p>2つ以上の商品に価格と容量を入れると、ここに安い順の値札が並びます。</p>
            <button type="button" className="btn small" onClick={() => setStore((s) => ({ ...s, items: SAMPLE.map((x) => ({ ...x, id: uid() })) }))}>
              ランドリン柔軟剤の例で試す
            </button>
          </div>
        ) : (
          <>
            {inRows.length === 1 && <p className="verdict">もう1つ商品を貼ると、どちらが安いか比べられます。</p>}
            {inRows.length >= 2 && (
              <p className="verdict">
                <b>{label(inRows[0].it, inRows[0].i)}</b>（{SHOP_LABEL[inRows[0].it.shop]}）がいちばん安く、2位より{((inRows[1].c.per / best - 1) * 100).toFixed(1)}%お得です。
                同じ{amountLabel(inRows[0].c.total, inRows[0].c.fam, inRows[0].it.unit)}を2位で買うより、約{yen((inRows[1].c.per - best) * inRows[0].c.total)}円安くなります。
              </p>
            )}
            <ol className="rank">
              {inRows.map((r, k) => (
                <li key={r.it.id} className={`tag${k === 0 ? ' best' : ''}`}>
                  <span className="pos num">{k + 1}</span>
                  <div className="head">
                    <span className="nm">{k === 0 && inRows.length > 1 && <span className="stamp">最安</span>}{label(r.it, r.i)}</span>
                    <span className="shop">{SHOP_LABEL[r.it.shop]}</span>
                  </div>
                  <div className="big">
                    <b className="num">{unitYen(r.c.per * base)}</b><small>円 / {baseName}</small>
                    {k > 0 && <span className="diff">+{((r.c.per / best - 1) * 100).toFixed(1)}%</span>}
                  </div>
                  <div className="facts">
                    <span>支払い <b>{yen(r.c.paid)}円</b>{r.c.ship > 0 && `（送料${yen(r.c.ship)}円込）`}</span>
                    <span>ポイント <b>{yen(r.c.back)}pt</b></span>
                    <span>量 <b>{amountLabel(r.c.total, r.c.fam, r.it.unit)}</b></span>
                  </div>
                  <div className="shopline">
                    {/^https?:\/\//.test(r.it.url.trim()) ? (
                      <a className="go" href={r.it.url.trim()} target="_blank" rel="noopener noreferrer">商品ページを開く</a>
                    ) : <span />}
                    <button type="button" className="linkbtn" onClick={() => {
                      const key = `tool:${saveName.trim() || label(r.it, r.i)}`;
                      addPurchase({ key, label: label(r.it, r.i).slice(0, 80), shop: SHOP_LABEL[r.it.shop], price: r.c.paid, total: r.c.total, per: r.c.per, perPage: (r.c.paid - r.c.pagePt) / r.c.total, fam: r.c.fam, unit: r.it.unit });
                      setNotice(`「${label(r.it, r.i)}」を買った記録に追加しました。「わたしの記録」で推移を見られます。`);
                    }}>これを買った</button>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
        {outRows.length > 0 && <p className="muted small">単位の種類が違うため比較から外しています：{outRows.map((r) => label(r.it, r.i)).join('、')}</p>}
      </section>

      <section aria-labelledby="t-items">
        <h2 id="t-items">比べている商品</h2>
        <div className="items">
          {store.items.map((it, i) => {
            const c = calc(it);
            const parsed = it.name && !it.manual ? parseQty(it.name) : null;
            const open = openMap[it.id] ?? !c;
            const bp = Math.max(num(it.price) - num(it.coupon), 0);
            const pageP = it.ptUnit === '%' ? (bp * num(it.pt)) / 100 : num(it.pt);
            const extraP = (bp * extraOf(it)) / 100;
            return (
              <details key={it.id} className="item" open={open}>
                <summary onClick={(e) => { e.preventDefault(); setOpenMap((m) => ({ ...m, [it.id]: !open })); }}>
                  <span className={`chip shop-${it.shop}`}>{SHOP_LABEL[it.shop]}</span>
                  <span className="sum">{label(it, i)}</span>
                  <span className="sumprice num">{c ? `${yen(c.eff)}円` : '未入力'}</span>
                  <span className="caret" aria-hidden>▾</span>
                </summary>
                <div className="body">
                  <div className="f full">
                    <label htmlFor={`${it.id}-name`}>商品名</label>
                    <input id={`${it.id}-name`} placeholder="例：ランドリン 詰め替え 1440ml 3個セット" value={it.name} onChange={(e) => onField(it, 'name', e.target.value)} />
                    {parsed && <span className="sub ok">読み取り：{parsed.size}{parsed.unit}{parsed.qty > 1 ? ` × ${parsed.qty}` : ''}（合計 {+(parsed.size * parsed.qty).toFixed(2)}{parsed.unit}）</span>}
                  </div>
                  <div className="f">
                    <label htmlFor={`${it.id}-shop`}>ショップ</label>
                    <select id={`${it.id}-shop`} value={it.shop} onChange={(e) => onField(it, 'shop', e.target.value)}>
                      {(Object.keys(SHOP_LABEL) as Shop[]).map((s) => <option key={s} value={s}>{SHOP_LABEL[s]}</option>)}
                    </select>
                  </div>
                  <div className="f">
                    <label htmlFor={`${it.id}-price`}>価格（税込・円）</label>
                    <input id={`${it.id}-price`} inputMode="decimal" value={it.price} onChange={(e) => onField(it, 'price', e.target.value)} />
                  </div>
                  <div className="f">
                    <label htmlFor={`${it.id}-size`}>容量（1つあたり）</label>
                    <div className="row">
                      <input id={`${it.id}-size`} inputMode="decimal" value={it.size} onChange={(e) => onField(it, 'size', e.target.value)} />
                      <select aria-label="単位" value={it.unit} onChange={(e) => onField(it, 'unit', e.target.value)}>
                        {Object.keys(UNITS).map((u) => <option key={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="f">
                    <label htmlFor={`${it.id}-qty`}>個数</label>
                    <input id={`${it.id}-qty`} inputMode="decimal" value={it.qty} onChange={(e) => onField(it, 'qty', e.target.value)} />
                  </div>
                  <div className="f">
                    <label htmlFor={`${it.id}-ship`}>送料（円）</label>
                    <input id={`${it.id}-ship`} inputMode="decimal" placeholder="無料なら空欄" value={it.ship} onChange={(e) => onField(it, 'ship', e.target.value)} />
                  </div>
                  <div className="f">
                    <label htmlFor={`${it.id}-pt`}>ページのポイント</label>
                    <div className="row">
                      <input id={`${it.id}-pt`} inputMode="decimal" placeholder={PTPH[it.shop]} value={it.pt} onChange={(e) => onField(it, 'pt', e.target.value)} />
                      <select aria-label="ポイントの単位" value={it.ptUnit} onChange={(e) => onField(it, 'ptUnit', e.target.value)}>
                        <option value="pt">pt</option><option value="%">%</option>
                      </select>
                    </div>
                    <span className="sub">{PTHINT[it.shop]}</span>
                  </div>
                  <details className="more">
                    <summary>URL・クーポン・上乗せを変える</summary>
                    <div className="body inner">
                      <div className="f full">
                        <label htmlFor={`${it.id}-url`}>商品ページのURL</label>
                        <input id={`${it.id}-url`} type="url" inputMode="url" placeholder="貼るとショップを自動で選びます" value={it.url} onChange={(e) => onField(it, 'url', e.target.value)} />
                      </div>
                      <div className="f">
                        <label htmlFor={`${it.id}-coupon`}>クーポン（円引き）</label>
                        <input id={`${it.id}-coupon`} inputMode="decimal" placeholder="なければ空欄" value={it.coupon} onChange={(e) => onField(it, 'coupon', e.target.value)} />
                      </div>
                      <div className="f">
                        <label htmlFor={`${it.id}-extra`}>上乗せ（%）</label>
                        <input id={`${it.id}-extra`} inputMode="decimal" placeholder={`${conditions[it.shop] || 0}（いつもの条件）`} value={it.extra} onChange={(e) => onField(it, 'extra', e.target.value)} />
                        <span className="sub">{EXTRA_HINT[it.shop]}</span>
                      </div>
                    </div>
                  </details>
                  <div className="ptout" aria-live="polite">
                    {bp > 0 ? (<>もらえるポイント <b className="num">{yen(pageP + extraP)}</b>pt{extraP > 0 && <span>（ページ分 {yen(pageP)} ＋ 上乗せ {yen(extraP)}）</span>}</>) : '価格を入れると、もらえるポイントが出ます'}
                  </div>
                  <div className="acts">
                    <button type="button" className="btn ghost small" onClick={() => {
                      const copy = { ...it, id: uid() };
                      setStore((s) => { const a = [...s.items]; a.splice(i + 1, 0, copy); return { ...s, items: a }; });
                      setOpenMap((m) => ({ ...m, [copy.id]: true }));
                    }}>複製</button>
                    <button type="button" className="btn ghost small danger" onClick={() => setStore((s) => ({ ...s, items: s.items.filter((x) => x.id !== it.id) }))}>削除</button>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
        <button type="button" className="btn add" onClick={() => {
          const last = store.items[store.items.length - 1];
          const it = blank(last?.shop || 'amazon', last?.unit || defaultUnit);
          setStore((s) => ({ ...s, items: [...s.items, it] }));
          setOpenMap((m) => ({ ...m, [it.id]: true }));
        }}>＋ 手で入力して追加</button>
      </section>

      <section aria-labelledby="t-saved">
        <h2 id="t-saved">保存と共有</h2>
        <div className="saverow">
          <input aria-label="比較の名前" placeholder="例：柔軟剤 ランドリン" value={saveName} onChange={(e) => setSaveName(e.target.value)} />
          <button type="button" className="btn primary" disabled={store.items.length === 0} onClick={() => {
            const name = saveName.trim() || `比較 ${new Date().toLocaleDateString('ja-JP')}`;
            setStore((s) => ({ ...s, saved: [{ name, items: s.items, base: s.base }, ...s.saved.filter((x) => x.name !== name)] }));
            setNotice(`「${name}」を保存しました。次回は価格を直すだけで比べられます。`);
          }}>保存</button>
        </div>
        <div className="rowbtns">
          <button type="button" className="btn" onClick={share} disabled={rows.length === 0}>家族に共有する</button>
          <button type="button" className="btn ghost" onClick={() => { setStore((s) => ({ ...s, items: [] })); setSaveName(''); setNotice(''); }}>新しい比較をはじめる</button>
        </div>
        {store.saved.length > 0 && (
          <ul className="saved">
            {store.saved.map((s) => (
              <li key={s.name}>
                <span>{s.name}（{s.items.length}件）</span>
                <button type="button" className="btn small" onClick={() => { setStore((x) => ({ ...x, items: s.items.map((i) => ({ ...i, id: uid() })), base: s.base })); setSaveName(s.name); topRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>開く</button>
                <button type="button" className="btn small ghost danger" onClick={() => setStore((x) => ({ ...x, saved: x.saved.filter((y) => y.name !== s.name) }))}>削除</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
