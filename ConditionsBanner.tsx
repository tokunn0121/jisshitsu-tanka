'use client';
import { useConditions } from './ConditionsProvider';

export default function ConditionsBanner() {
  const { conditions, openSheet, ready } = useConditions();
  if (!ready || conditions.setupDone) return null;
  return (
    <div className="banner">
      <p>楽天カードやPayPayの上乗せ分を登録すると、順位があなたの条件で並び替わります。</p>
      <button type="button" className="btn primary small" onClick={openSheet}>
        条件を登録する
      </button>
    </div>
  );
}
