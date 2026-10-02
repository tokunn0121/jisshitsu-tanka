import type { Metadata } from 'next';
import MyPurchases from '@/components/MyPurchases';
import { CATEGORIES } from '@/lib/categories';
import { getHistory } from '@/lib/history';

export const revalidate = 3600;
export const metadata: Metadata = { title: 'わたしの購入記録', robots: { index: false, follow: true }, alternates: { canonical: '/my' } };

export default async function MyPage() {
  const histories = Object.fromEntries(await Promise.all(CATEGORIES.map(async (c) => [c.slug, await getHistory(c.slug, 90)] as const)));
  const cats = CATEGORIES.map((c) => ({ slug: c.slug, short: c.short, base: c.base, baseLabel: c.baseLabel }));
  return (
    <>
      <h1>わたしの購入記録</h1>
      <p className="lead">「これを買った」で記録した単価を、相場の推移と重ねて見られます。買う間隔から、次に買う時期の目安も出します。</p>
      <MyPurchases cats={cats} histories={histories} />
    </>
  );
}
