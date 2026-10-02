import { getCategory, type Category } from './categories';
import { resolveTitles, type Basis } from './parse-ai';
import { UNITS, type Fam } from './units';
import { searchRakuten, type RawItem } from './sources/rakuten';
import { searchYahoo } from './sources/yahoo';
import { rakutenLink, yahooLink } from './affiliate';

export type RankItem = {
  id: string;
  source: 'rakuten' | 'yahoo';
  name: string;
  shop: string;
  price: number;
  pointPct: number;
  pointAmount: number;
  size: number;
  unit: string;
  qty: number;
  total: number; // 基準単位での総量
  fam: Fam;
  href: string;
  sponsored: boolean;
  image?: string;
  basis: Basis;
  parsedNote: string;
};
export type Ranking = {
  category: Category;
  items: RankItem[];
  fetchedAt: string;
  indexable: boolean;
  sources: { rakuten: number; yahoo: number };
  excluded: number;
};

export const MIN_ITEMS_FOR_INDEX = 10;

function prefilter(c: Category, r: RawItem): boolean {
  return r.freeShipping && r.price > 0 && !c.exclude.test(r.name);
}

async function normalizeAll(c: Category, raws: RawItem[]): Promise<{ items: RankItem[]; excluded: number }> {
  const pre = raws.filter((r) => prefilter(c, r));
  const parsed = await resolveTitles(pre.map((r) => r.name), c.fams);
  const items: RankItem[] = [];
  let excluded = 0;
  pre.forEach((r, k) => {
    const p = parsed[k];
    if (!p.accepted || p.confidence === undefined) { excluded++; return; }
    const u = UNITS[p.unit];
    if (!u || !c.fams.includes(u.fam)) { excluded++; return; }
    const unitSize = p.size * u.f;
    if (c.unitSize && (unitSize < c.unitSize[0] || unitSize > c.unitSize[1])) return;
    const total = unitSize * p.qty;
    if (total < c.total[0] || total > c.total[1]) return;
    const link = r.source === 'rakuten' ? rakutenLink(r.url, r.affiliateUrl) : yahooLink(r.url);
    items.push({
      id: r.id, source: r.source, name: r.name, shop: r.shop, price: r.price, pointPct: r.pointPct, pointAmount: r.pointAmount,
      size: p.size, unit: p.unit, qty: p.qty, total, fam: u.fam, href: link.href, sponsored: link.sponsored, image: r.image,
      basis: p.basis, parsedNote: p.note,
    });
  });
  return { items, excluded };
}

// 表示ポイントのみで計算した基準の実質単価（並べ替えの初期値）
export function basePer(i: RankItem, extraPct = 0): number {
  const pts = (i.price * (i.pointPct + extraPct)) / 100 + i.pointAmount;
  return (i.price - pts) / i.total;
}

export async function getRanking(slug: string, opts: { fresh?: boolean } = {}): Promise<Ranking | null> {
  const c = getCategory(slug);
  if (!c) return null;
  const [r, y] = await Promise.all([searchRakuten(c.query, 2, !!opts.fresh), searchYahoo(c.query, !!opts.fresh)]);
  const seen = new Set<string>();
  const { items: all, excluded } = await normalizeAll(c, [...r, ...y]);
  const items: RankItem[] = [];
  for (const it of all) {
    const key = `${it.source}|${it.shop}|${it.price}|${it.total}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(it);
  }
  items.sort((a, b) => basePer(a) - basePer(b));
  const top = items.slice(0, 40);
  return {
    category: c,
    items: top,
    fetchedAt: new Date().toISOString(),
    indexable: top.length >= MIN_ITEMS_FOR_INDEX,
    excluded,
    sources: { rakuten: top.filter((i) => i.source === 'rakuten').length, yahoo: top.filter((i) => i.source === 'yahoo').length },
  };
}

export type RankStats = { min: number; median: number; count: number };
// 表示ポイントのみで計算した最安・中央値（ページの見出し用。利用者の上乗せは含めない）
export function rankStats(items: RankItem[]): RankStats | null {
  if (!items.length) return null;
  const pers = items.map((i) => basePer(i)).sort((a, b) => a - b);
  const mid = Math.floor(pers.length / 2);
  const median = pers.length % 2 ? pers[mid] : (pers[mid - 1] + pers[mid]) / 2;
  return { min: pers[0], median, count: pers.length };
}
