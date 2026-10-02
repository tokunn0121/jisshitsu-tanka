'use client';
import { useConditions } from './ConditionsProvider';

export default function ConditionsChip() {
  const { conditions: c, openSheet, ready } = useConditions();
  const parts = [
    c.rakuten ? `楽天+${c.rakuten}%` : '',
    c.yahoo ? `Yahoo!+${c.yahoo}%` : '',
    c.amazon ? `Amazon+${c.amazon}%` : '',
  ].filter(Boolean);
  return (
    <button type="button" className="condchip" onClick={openSheet}>
      {!ready ? 'あなたの条件' : parts.length ? parts.join('／') : '上乗せポイントを設定'}
    </button>
  );
}
