export type Fam = 'vol' | 'wt' | 'cnt';
export const UNITS: Record<string, { fam: Fam; f: number }> = {
  ml: { fam: 'vol', f: 1 },
  L: { fam: 'vol', f: 1000 },
  g: { fam: 'wt', f: 1 },
  kg: { fam: 'wt', f: 1000 },
  '枚': { fam: 'cnt', f: 1 },
  '個': { fam: 'cnt', f: 1 },
  '本': { fam: 'cnt', f: 1 },
  '組': { fam: 'cnt', f: 1 },
  'ロール': { fam: 'cnt', f: 1 },
  '包': { fam: 'cnt', f: 1 },
  '錠': { fam: 'cnt', f: 1 },
  '回': { fam: 'cnt', f: 1 },
};
export const BASES: Record<'vol' | 'wt', [number, string][]> = {
  vol: [[1, '1ml'], [100, '100ml'], [1000, '1L']],
  wt: [[1, '1g'], [100, '100g'], [1000, '1kg']],
};

export function amountLabel(total: number, fam: Fam, unit: string): string {
  if (fam === 'vol') return total >= 1000 ? `${+(total / 1000).toFixed(3)}L` : `${+total.toFixed(1)}ml`;
  if (fam === 'wt') return total >= 1000 ? `${+(total / 1000).toFixed(3)}kg` : `${+total.toFixed(1)}g`;
  return `${+total.toFixed(1)}${unit}`;
}
export function yen(v: number): string {
  return Math.round(v).toLocaleString('ja-JP');
}
export function unitYen(v: number): string {
  const d = v >= 1000 ? 0 : v >= 10 ? 1 : v >= 1 ? 2 : 3;
  return v.toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
}
