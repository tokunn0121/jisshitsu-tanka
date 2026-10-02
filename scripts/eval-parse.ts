// 正解表（tests/gold.json）で商品名の読み取り精度を測る
//   npm run eval            … ルールだけ
//   npm run eval -- --ai    … 自信の低いものをAIに回す（ANTHROPIC_API_KEYが必要）
import { readFileSync } from 'node:fs';
import * as P from '../lib/parse';
import { UNITS } from '../lib/units';

type Gold = { t: string; a: string[] };
const gold: Gold[] = JSON.parse(readFileSync(new URL(process.argv.includes('--holdout') ? '../tests/holdout.json' : '../tests/gold.json', import.meta.url), 'utf8'));
const useAi = process.argv.includes('--ai');

function answer(r: { size: number; unit: string; qty: number } | null): string | null {
  if (!r) return null;
  const u = UNITS[r.unit];
  if (!u) return null;
  const total = +(r.size * u.f * r.qty).toFixed(2);
  const base = u.fam === 'vol' ? 'ml' : u.fam === 'wt' ? 'g' : r.unit;
  return `${total}${base}`;
}

async function main() {
  let accepted = 0, correct = 0, wrong = 0, missed = 0, rejOk = 0, rejBad = 0, answerable = 0;
  const lines: string[] = [];
  const results = useAi ? await (await import('../lib/parse-ai')).resolveTitles(gold.map((g) => g.t)) : null;
  gold.forEach((g, i) => {
    const d = results ? results[i] : (P as any).parseQtyDetailed ? (P as any).parseQtyDetailed(g.t) : (P as any).parseQty(g.t);
    const ok = d && (d.confidence ? d.confidence !== 'low' && d.accepted !== false : true);
    const ans = ok ? answer(d) : null;
    const expectReject = g.a.includes('reject');
    const okAnswers = g.a.filter((x) => x !== 'reject');
    if (okAnswers.length) answerable++;
    if (ans) accepted++;
    let mark = '';
    if (!ans) {
      if (expectReject) { rejOk++; mark = 'OK 除外'; }
      else { missed++; mark = '-- 除外（読めず）'; }
    } else if (okAnswers.includes(ans)) { correct++; mark = 'OK'; }
    else if (expectReject) { rejBad++; mark = 'NG 除外すべきを採用'; }
    else { wrong++; mark = 'NG 誤読'; }
    if (!mark.startsWith('OK')) lines.push(`${mark}\t${ans ?? '-'}\t正解:${g.a.join('/')}\t${d?.confidence ?? ''}\t${g.t}`);
  });
  console.log(lines.join('\n'));
  console.log('\n件数', gold.length, '／採用', accepted);
  console.log('採用したものの正答率（精度）', ((correct / Math.max(accepted, 1)) * 100).toFixed(1) + '%', `(${correct}/${accepted})`);
  console.log('読めるはずのものを正しく採用（網羅率）', ((correct / answerable) * 100).toFixed(1) + '%', `(${correct}/${answerable})`);
  console.log('誤読', wrong, '／除外すべきを採用', rejBad, '／読めず除外', missed);
}
main();
