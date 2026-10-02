'use client';
import { useCallback, useEffect, useState } from 'react';

// 「これを買った」の記録。端末の中（localStorage）だけに保存する
export type Purchase = {
  id: string;
  date: string; // YYYY-MM-DD
  key: string; // カテゴリslug、またはツールでは "tool:比較名"
  label: string; // 商品名
  shop: string;
  price: number; // 支払い（円）
  total: number; // 基準単位での量
  per: number; // 上乗せ込みの実質単価（円 / 基準単位）
  perPage: number; // 表示ポイントのみの実質単価（相場の線と比べる用）
  fam: 'vol' | 'wt' | 'cnt';
  unit: string;
};

const KEY = 'jt-purchases-v1';
const EVT = 'jt-purchases-change';

function read(): Purchase[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
function write(list: Purchase[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  window.dispatchEvent(new Event(EVT));
}
export function todayJst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function usePurchases() {
  const [list, setList] = useState<Purchase[]>([]);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const add = useCallback((p: Omit<Purchase, 'id' | 'date'> & { date?: string }) => {
    const entry: Purchase = { ...p, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date: p.date || todayJst() };
    write([...read(), entry].sort((a, b) => a.date.localeCompare(b.date)));
    return entry;
  }, []);
  const remove = useCallback((id: string) => write(read().filter((x) => x.id !== id)), []);
  const update = useCallback((id: string, patch: Partial<Purchase>) => write(read().map((x) => (x.id === id ? { ...x, ...patch } : x))), []);
  return { list, add, remove, update };
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
