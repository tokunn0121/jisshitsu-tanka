// 商品名から「1つあたりの容量」と「個数」を読み取る（ルールベース）
// confidence: high＝そのまま採用 / mid＝採用するがAIで確かめたい / low＝ルールでは判断できない
import type { Fam } from './units';

export type Parsed = { size: number; unit: string; qty: number };
export type Confidence = 'high' | 'mid' | 'low';
export type Detailed = Parsed & { confidence: Confidence; note: string; fam: Fam };

export function toHalf(s: unknown): string {
  return String(s ?? '')
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ');
}
export function num(v: unknown): number {
  const x = parseFloat(toHalf(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(x) ? x : 0;
}

const SIZE_UNIT: Record<string, { unit: string; fam: Fam }> = {
  ml: { unit: 'ml', fam: 'vol' }, l: { unit: 'L', fam: 'vol' }, g: { unit: 'g', fam: 'wt' }, kg: { unit: 'kg', fam: 'wt' },
};
const F: Record<string, number> = { ml: 1, L: 1000, g: 1, kg: 1000 };
const MULT_TAIL = '(?:本|個|袋|パック|箱|ケース|セット|入り?|P|コ|点|缶)?';
const SHEET = '枚|組|ロール';
const COUNT = '枚|組|ロール|包|錠|粒|個|回分|本';
const MIXED = /[＆&]\s*(?:コンディショナー|トリートメント|リンス)|シャンプー.{0,10}コンディショナー|本体\s*[+＋]|[+＋]\s*(?:詰|つめ)|本体.{0,20}(?:詰め?替|つめかえ).{0,6}[+＋]|選べる|よりどり|詰め合わせ|アソート|お好きな|組み合わせ自由|おまけ|プレゼント付/;

function normalize(title: string): string {
  let t = toHalf(title)
    .replace(/ℓ/g, 'L')
    .replace(/ミリリットル/g, 'ml')
    .replace(/リットル/g, 'L')
    .replace(/キログラム/g, 'kg')
    .replace(/グラム/g, 'g')
    .replace(/[×✕╳]/g, '×')
    .replace(/(\d)\s*[xX＊*]\s*(\d)/g, '$1×$2')
    .replace(/(ml|mL|ML|l|L|g|kg|本|個|袋|枚|組|ロール|パック)\s*[xX＊*]\s*(\d)/g, '$1×$2')
    .replace(/(\d),(\d{3})(?!\d)/g, '$1$2'); // 1,220 → 1220
  t = t
    .replace(/\d[\d,]*\s*円(?:以上)?/g, ' ') // 価格・送料条件
    .replace(/(?:P|ポイント)\s*\d+\s*倍/gi, ' ')
    .replace(/\d+\s*%/g, ' ')
    .replace(/楽天\s*\d+\s*位|\d{4}\s*年(?:産)?|令和\s*\d+\s*年産?/g, ' ')
    .replace(/\d+\s*倍(?:サイズ|容量)?/g, ' ') // 「3倍サイズ」は個数ではない
    // 体重の目安（5-10kg、~5kg、15kg~、5kgまで）は量ではない
    .replace(/\d+(?:\.\d+)?\s*(?:kg|g)?\s*[-~〜～－–]\s*\d+(?:\.\d+)?\s*(?:kg|g)/gi, ' ')
    .replace(/[~〜～]\s*\d+(?:\.\d+)?\s*kg/gi, ' ')
    .replace(/\d+(?:\.\d+)?\s*kg\s*(?:まで|以上|以下|未満|[~〜～])/gi, ' ');
  return t;
}

// 「×6本×2ケース」のような掛け算の連鎖を読む
function readChain(t: string, from: number): { qty: number; end: number; steps: number } {
  let qty = 1, pos = from, steps = 0;
  const re = new RegExp(`^\\s*(?:\\([^)]{0,20}\\))?\\s*[)）\\]]?\\s*${MULT_TAIL}\\s*×\\s*(\\d+)\\s*(回分)?\\s*${MULT_TAIL}`);
  for (;;) {
    const m = t.slice(pos).match(re);
    if (!m || m[2]) break;
    qty *= parseInt(m[1], 10);
    pos += m[0].length;
    steps++;
  }
  return { qty, end: pos, steps };
}

// 掛け算以外で書かれた個数（「4個セット」「12個入り」「3個」「2ケース」など）を集める
function looseCounts(t: string): { n: number; kind: 'set' | 'case' | 'bare' }[] {
  const out: { n: number; kind: 'set' | 'case' | 'bare' }[] = [];
  const set = /(\d+)\s*(?:個|本|袋|パック|点|コ|箱)\s*(?:セット|入り?|組|まとめ)/g;
  let m: RegExpExecArray | null;
  while ((m = set.exec(t))) out.push({ n: +m[1], kind: 'set' });
  const pre = /(?:セット|ケース販売|まとめ買い)[^\d]{0,6}(\d+)\s*(?:個|本|袋|パック|点|箱)/g;
  while ((m = pre.exec(t))) out.push({ n: +m[1], kind: 'set' });
  const kase = /(\d+)\s*(?:ケース|箱)(?!販売)/g;
  while ((m = kase.exec(t))) out.push({ n: +m[1], kind: 'case' });
  const bare = /(\d+)\s*(?:個|本|袋|パック)(?!\s*(?:セット|入|組|まとめ|×))/g;
  while ((m = bare.exec(t))) out.push({ n: +m[1], kind: 'bare' });
  return out;
}

function sizeBased(t: string): Detailed | null {
  // 「合計4.32L」「計12本」のような明示があれば最優先
  const re = /(\d+(?:\.\d+)?)\s*(ml|l|kg|g)(?![a-z])/gi;
  const list: { v: number; unit: string; fam: Fam; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const su = SIZE_UNIT[m[2].toLowerCase()];
    list.push({ v: parseFloat(m[1]), unit: su.unit, fam: su.fam, start: m.index, end: re.lastIndex });
  }
  if (!list.length) return null;
  const fam = list[0].fam;
  const same = list.filter((x) => x.fam === fam);
  const notes: string[] = [];
  let conf: Confidence = 'high';
  if (list.some((x) => x.fam !== fam)) { conf = 'low'; notes.push('mlとgが混在'); }

  // 掛け算が続く容量を優先して選ぶ
  let pick = same[0], chain = readChain(t, same[0].end);
  for (const c of same) {
    const ch = readChain(t, c.end);
    if (ch.steps > 0) { pick = c; chain = ch; break; }
  }
  let qty = chain.qty;
  const pickTotal = pick.v * F[pick.unit];

  // ほかの容量が「合計」を示しているか（4.32L(1440ml×3)、1440ml(480ml×3回分)）
  const others = same.filter((x) => x !== pick).map((x) => x.v * F[x.unit]);
  const total = pickTotal * qty;
  const distinctOthers = others.filter((o) => Math.abs(o - total) > 0.5 && Math.abs(o - pickTotal) > 0.5);
  const matchesTotal = others.some((o) => Math.abs(o - total) < 0.5);
  const tAfter = t.slice(chain.end);
  const tBefore = t.slice(0, pick.start);

  if (chain.steps === 0) {
    // 「480ml×3回分」の説明だけなら、大きい方が1つあたり
    const explain = others.length && same.some((x) => new RegExp(`^\\s*×\\s*\\d+\\s*回分`).test(t.slice(x.end)));
    if (explain) {
      const big = same.reduce((a, b) => (a.v * F[a.unit] >= b.v * F[b.unit] ? a : b));
      pick = big;
    }
    const counts = looseCounts(t);
    const sets = counts.filter((c) => c.kind === 'set');
    const cases = counts.filter((c) => c.kind === 'case');
    const bares = counts.filter((c) => c.kind === 'bare');
    // 「24本×2ケース」「6本入×2箱」のように、容量と離れて書かれた掛け算
    const sep = t.match(/(\d+)\s*(?:本|個|袋|パック|枚)\s*(?:入り?)?\s*×\s*(\d+)\s*(?:ケース|箱|セット|パック|袋)?/);
    const total2 = t.match(/計\s*(\d+)\s*(?:本|個|袋)/);
    if (sep) { qty = +sep[1] * +sep[2]; notes.push('容量と離れた掛け算'); }
    else if (total2) { qty = +total2[1]; }
    else if (sets.length) {
      const ns = Array.from(new Set(sets.map((s) => s.n)));
      qty = ns[0];
      if (ns.length > 1) { conf = 'low'; notes.push('個数が複数'); }
      if (cases.length && !/ケース販売/.test(t)) { qty *= cases[0].n; notes.push('ケース数を掛けた'); conf = conf === 'high' ? 'mid' : conf; }
    } else if (bares.length) {
      const ns = Array.from(new Set(bares.map((s) => s.n)));
      qty = ns[0];
      if (ns.length > 1) { conf = 'low'; notes.push('個数が複数'); }
      if (cases.length) qty *= cases[0].n;
      if (conf === 'high') conf = 'mid';
      notes.push('「セット」なしの個数');
    } else if (cases.length && cases[0].n > 1) {
      qty = cases[0].n; conf = 'low'; notes.push('ケース内の本数が不明');
    }
    if (distinctOthers.length && !explain) { conf = 'low'; notes.push('容量が複数'); }
  } else {
    // 掛け算のあとに「2ケース」が別に書かれている（500ml×24本 2ケース）
    const extraCase = tAfter.match(/^[^\d(（]{0,4}(\d+)\s*(?:ケース|箱)/) || tBefore.match(/【\s*(\d+)\s*(?:ケース|箱)\s*】/);
    if (extraCase && +extraCase[1] > 1) { qty *= +extraCase[1]; notes.push('ケース数を掛けた'); if (conf === 'high') conf = 'mid'; }
    const preSet = tBefore.match(/【\s*(\d+)\s*セット\s*】/);
    if (preSet && +preSet[1] > 1) { qty *= +preSet[1]; notes.push('セット数を掛けた'); if (conf === 'high') conf = 'mid'; }
    if (distinctOthers.length && !matchesTotal) { conf = 'low'; notes.push('容量が複数'); }
  }
  if (MIXED.test(t)) { conf = 'low'; notes.push('セット内容が混在'); }
  return { size: pick.v, unit: pick.unit, qty, confidence: conf, note: notes.join('・'), fam: pick.fam };
}

function countBased(t: string): Detailed | null {
  // 160組(320枚)×5箱 のように括弧をはさむ掛け算にも対応
  const m = t.match(new RegExp(`(\\d+)\\s*(${COUNT})\\s*(?:入り?)?`));
  if (!m) return null;
  const first = t.search(new RegExp(`\\d+\\s*(?:${COUNT})`));
  // 掛け算が続くものを優先
  const re = new RegExp(`(\\d+)\\s*(${COUNT})\\s*(?:入り?)?`, 'g');
  let best: { n: number; unit: string; qty: number; steps: number; idx: number } | null = null;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(t))) {
    if (mm[2] === '本' && !/本\s*入|本\s*×|\d+\s*本$/.test(mm[0] + t.slice(re.lastIndex, re.lastIndex + 2))) { /* 単位としての本 */ }
    const ch = readChain(t, re.lastIndex);
    if (!best || (ch.steps > best.steps)) best = { n: +mm[1], unit: mm[2], qty: ch.qty, steps: ch.steps, idx: mm.index };
  }
  if (!best) return null;
  let conf: Confidence = 'high';
  const notes: string[] = [];
  let qty = best.qty;
  if (best.steps === 0) {
    const sepMul = t.slice(best.idx).match(new RegExp(`^\\d+\\s*(?:${COUNT})\\s*(?:入り?)?\\s*(\\d+)\\s*(?:箱|個|袋|パック)\\s*×\\s*(\\d+)`));
    if (sepMul) return { size: best.n, unit: unitName(best.unit), qty: +sepMul[1] * +sepMul[2], confidence: 'mid', note: '離れた掛け算', fam: 'cnt' };
    // 50枚入 4パック
    const after = t.slice(best.idx).match(new RegExp(`^\\d+\\s*(?:${COUNT})\\s*(?:入り?)?\\s*[\\s・/]*\\s*(\\d+)\\s*(?:パック|袋|個|箱|セット|P)`));
    if (after) { qty = +after[1]; conf = 'mid'; notes.push('「×」なしの個数'); }
  }
  // 括弧内の合計（176枚）と一致するか確認
  const totals = Array.from(t.matchAll(new RegExp(`(\\d+)\\s*${best.unit}`, 'g'))).map((x) => +x[1]);
  const total = best.n * qty;
  if (totals.length > 1 && !totals.includes(total) && best.steps === 0) {
    // 256枚 (64枚×4) のように、最初の数が合計の場合
    const chained = Array.from(t.matchAll(new RegExp(`(\\d+)\\s*${best.unit}\\s*×\\s*(\\d+)`, 'g')))[0];
    if (chained) return { size: +chained[1], unit: unitName(best.unit), qty: +chained[2], confidence: 'mid', note: '合計と内訳', fam: 'cnt' };
    conf = 'low'; notes.push('数が複数');
  }
  if (MIXED.test(t)) { conf = 'low'; notes.push('セット内容が混在'); }
  void first;
  return { size: best.n, unit: unitName(best.unit), qty, confidence: conf, note: notes.join('・'), fam: 'cnt' };
}
function unitName(u: string) {
  return u === '回分' ? '回' : u === '粒' ? '錠' : u;
}

export function parseQtyDetailed(title: string, prefer?: Fam[]): Detailed | null {
  const t = normalize(title);
  const s = sizeBased(t);
  const c = countBased(t);
  const sheet = new RegExp(`\\d+\\s*(?:${SHEET})`).test(t);
  let pick: Detailed | null;
  if (prefer && prefer.length) {
    pick = s && prefer.includes(s.fam) ? s : c && prefer.includes(c.fam) ? c : null;
  } else if (s && c && sheet) {
    pick = { ...c, confidence: c.confidence === 'high' ? 'mid' : c.confidence, note: [c.note, '容量表記もあり'].filter(Boolean).join('・') }; // ゴミ袋45L 100枚 など
  } else pick = s || (c && (c.unit === '本' || c.unit === '個') ? { ...c, confidence: c.confidence === 'high' ? ('mid' as Confidence) : c.confidence } : c);
  return pick;
}

export function parseQty(title: string): Parsed | null {
  const d = parseQtyDetailed(title);
  return d ? { size: d.size, unit: d.unit, qty: d.qty } : null;
}

export type Shop = 'amazon' | 'rakuten' | 'yahoo' | 'other';
export function detectShop(url: string): Shop | null {
  const u = String(url).toLowerCase();
  if (/amazon\.co\.jp|amzn\.(asia|to)/.test(u)) return 'amazon';
  if (/rakuten\.co\.jp|r10\.to/.test(u)) return 'rakuten';
  if (/yahoo\.co\.jp|paypaymall/.test(u)) return 'yahoo';
  return null;
}
