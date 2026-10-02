import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import { getRanking, rankStats } from '@/lib/rank';
import { unitYen } from '@/lib/units';

// 各カテゴリの「今日の最安」を値札の形で並べる
export default async function CategoryBoard() {
  const data = await Promise.all(
    CATEGORIES.map(async (c) => {
      const r = await getRanking(c.slug);
      return { c, stats: r ? rankStats(r.items) : null };
    }),
  );
  return (
    <ul className="board">
      {data.map(({ c, stats }) => (
        <li key={c.slug}>
          <Link href={`/rank/${c.slug}`} className="boardcard">
            <span className="boardname">{c.short}</span>
            {stats ? (
              <>
                <span className="boardprice"><b className="num">{unitYen(stats.min * c.base)}</b>円 / {c.baseLabel}</span>
                <span className="boardsub">相場 {unitYen(stats.median * c.base)}円・{stats.count}件から</span>
              </>
            ) : (
              <span className="boardsub">価格を準備中</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
