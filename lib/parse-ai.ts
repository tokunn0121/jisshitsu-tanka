// 読み取りの二段目：ルールで自信が低い商品名だけをAIに読ませ、結果を照合する
import { parseQtyDetailed, type Detailed } from './parse';
import { UNITS, type Fam } from './units';

export type Basis = 'rule' | 'rule+ai' | 'ai' | 'none';
export type Resolved = (Detailed & { accepted: boolean; basis: Basis }) | { accepted: false; basis: 'none'; note: string; confidence?: undefined };

type AiOut = { size: number; unit: string; qty: number; confident: boolean; reason?: string };
const memo = new Map<string, AiOut | null>();
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

const SYSTEM = `あなたは日本の通販の商品名から「1つあたりの容量」と「個数」を読み取る係です。
次の規則で、各商品名についてJSONを返してください。
- unit は ml, L, g, kg, 枚, 組, ロール, 個, 本, 包, 錠, 回 のいずれか
- size は1つあたりの量、qty は買う個数（ケース・箱・セットの掛け算をすべて掛ける）
- 「5-10kg」「~5kg」のような体重の目安、「3倍サイズ」「約57回分」「ポイント10倍」は量でも個数でもない
- 「1440ml(480ml×3回分)」は1440mlが1つ
- ゴミ袋の「45L」のように容量が商品の大きさを表すときは、枚数を量にする
- 本体と詰め替えのセット、シャンプーとコンディショナーの組み合わせ、「選べる」「よりどり」など中身が1種類に決まらないものは confident を false にする
- 少しでも迷ったら confident を false にする
出力は [{"i":番号,"size":数,"unit":"単位","qty":数,"confident":true/false,"reason":"短い理由"}] のJSON配列だけにしてください。前置きやコードブロックは不要です。`;

async function cacheGet(titles: string[]): Promise<Record<string, AiOut>> {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, ''), key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key || !titles.length) return {};
  try {
    const list = titles.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(',');
    const res = await fetch(`${base}/rest/v1/parse_cache?select=title,result&title=in.(${encodeURIComponent(list)})`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
    });
    if (!res.ok) return {};
    const rows: { title: string; result: AiOut }[] = await res.json();
    return Object.fromEntries(rows.map((r) => [r.title, r.result]));
  } catch { return {}; }
}
async function cachePut(rows: { title: string; result: AiOut }[]) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, ''), key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key || !rows.length) return;
  try {
    await fetch(`${base}/rest/v1/parse_cache?on_conflict=title`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows.map((r) => ({ ...r, model: MODEL() }))),
      cache: 'no-store',
    });
  } catch {}
}

async function askAi(titles: string[]): Promise<(AiOut | null)[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !titles.length) return titles.map(() => null);
  const out: (AiOut | null)[] = [];
  for (let i = 0; i < titles.length; i += 30) {
    const chunk = titles.slice(i, i + 30);
    const user = chunk.map((t, k) => `${k}: ${t}`).join('\n');
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: MODEL(), max_tokens: 4000, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
        cache: 'no-store',
      });
      if (!res.ok) { console.error('[parse-ai]', res.status, await res.text().catch(() => '')); chunk.forEach(() => out.push(null)); continue; }
      const json: any = await res.json();
      const text = (json.content || []).map((c: any) => c.text || '').join('').replace(/```json|```/g, '').trim();
      const arr: (AiOut & { i: number })[] = JSON.parse(text);
      chunk.forEach((_, k) => {
        const hit = arr.find((a) => a.i === k);
        out.push(hit && UNITS[hit.unit] && hit.size > 0 && hit.qty > 0 ? { size: +hit.size, unit: hit.unit, qty: +hit.qty, confident: !!hit.confident, reason: hit.reason } : null);
      });
    } catch (e) {
      console.error('[parse-ai] failed', e);
      chunk.forEach(() => out.push(null));
    }
  }
  return out;
}

const total = (x: { size: number; unit: string; qty: number }) => x.size * (UNITS[x.unit]?.f ?? 1) * x.qty;
const famOf = (u: string): Fam => UNITS[u]?.fam ?? 'cnt';

export async function resolveTitles(titles: string[], prefer?: Fam[]): Promise<Resolved[]> {
  const rules = titles.map((t) => parseQtyDetailed(t, prefer));
  const need = Array.from(new Set(titles.filter((t, i) => !rules[i] || rules[i]!.confidence !== 'high')));
  const ai: Record<string, AiOut | null> = {};
  const fromCache = await cacheGet(need.filter((t) => !memo.has(t)));
  for (const t of need) {
    if (memo.has(t)) ai[t] = memo.get(t)!;
    else if (fromCache[t]) { ai[t] = fromCache[t]; memo.set(t, fromCache[t]); }
  }
  const ask = need.filter((t) => !(t in ai));
  const answers = await askAi(ask);
  const fresh: { title: string; result: AiOut }[] = [];
  ask.forEach((t, k) => {
    ai[t] = answers[k];
    memo.set(t, answers[k]);
    if (answers[k]) fresh.push({ title: t, result: answers[k]! });
  });
  await cachePut(fresh);
  const aiOn = !!process.env.ANTHROPIC_API_KEY;

  return titles.map((t, i): Resolved => {
    const r = rules[i];
    if (r && r.confidence === 'high') return { ...r, accepted: true, basis: 'rule' };
    const a = ai[t];
    const famOk = (f: Fam) => !prefer || !prefer.length || prefer.includes(f);
    if (r && r.confidence === 'mid') {
      if (!aiOn) return { ...r, accepted: true, basis: 'rule' };
      if (a && Math.abs(total(a) - total(r)) <= total(r) * 0.005 && famOf(a.unit) === r.fam) return { ...r, confidence: 'high', accepted: true, basis: 'rule+ai' };
      return { ...r, accepted: false, basis: 'none', note: [r.note, 'AIと読み取りが不一致'].filter(Boolean).join('・') };
    }
    if (a && a.confident && famOk(famOf(a.unit))) {
      return { size: a.size, unit: a.unit, qty: a.qty, fam: famOf(a.unit), confidence: 'mid', note: a.reason || 'AIで読み取り', accepted: true, basis: 'ai' };
    }
    return { accepted: false, basis: 'none', note: r?.note || '容量を読み取れない' };
  });
}
