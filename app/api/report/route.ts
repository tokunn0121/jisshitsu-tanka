import { NextResponse } from 'next/server';

// 「読み取りが違う」報告を受け取り、Supabaseに保存する
export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const title = String(body.title || '').slice(0, 300);
  if (!title) return NextResponse.json({ ok: false }, { status: 400 });
  const base = process.env.SUPABASE_URL?.replace(/\/$/, ''), key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return NextResponse.json({ ok: true, stored: false });
  const res = await fetch(`${base}/rest/v1/parse_reports`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ category: String(body.category || '').slice(0, 60), title, parsed: String(body.parsed || '').slice(0, 60) }),
    cache: 'no-store',
  });
  return NextResponse.json({ ok: res.ok, stored: res.ok });
}
