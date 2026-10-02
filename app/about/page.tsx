import type { Metadata } from 'next';

export const metadata: Metadata = { title: '運営者情報', alternates: { canonical: '/about' }, robots: { index: false, follow: true } };

export default function About() {
  return (
    <article className="prose">
      <h1>運営者情報</h1>
      <p>実質単価くらべは、日用品をポイント込みの本当の値段で比べたい、という自分の不便から作った個人運営のサイトです。</p>
      <h2>広告について</h2>
      <p>当サイトはアフィリエイト広告を利用しています。リンク経由で商品が購入されると、運営者に紹介料が支払われることがあります。紹介料の有無によってランキングの順位を変えることはありません。</p>
      <h2>お問い合わせ</h2>
      <p>（ここに連絡先を記入）</p>
    </article>
  );
}
