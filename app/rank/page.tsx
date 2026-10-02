import type { Metadata } from 'next';
import CategoryBoard from '@/components/CategoryBoard';

export const revalidate = 86400;
export const metadata: Metadata = {
  title: '日用品の実質単価ランキング一覧',
  description: '柔軟剤・洗濯洗剤の詰め替えや水のケース買いを、送料無料の商品だけに絞り、ポイント込みの実質単価で毎日比較しています。',
  alternates: { canonical: '/rank' },
};

export default function RankIndex() {
  return (
    <>
      <h1>日用品の実質単価ランキング</h1>
      <p className="lead">楽天市場とYahoo!ショッピングの送料無料の商品を毎日取得し、ポイント込みの単価で並べています。上乗せポイントを登録すると、あなたの条件で並び替わります。</p>
      <CategoryBoard />
    </>
  );
}
