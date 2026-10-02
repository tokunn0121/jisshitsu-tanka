import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const GUIDES = {
  keisan: {
    title: '実質単価の計算方法｜送料・クーポン・ポイントの数え方',
    h1: '実質単価の計算方法',
    lead: '容量や個数、送料、ポイントが違う商品を、同じものさしで比べるための考え方です。',
  },
  kijun: {
    title: '掲載基準と更新タイミング',
    h1: '掲載基準と更新タイミング',
    lead: 'ランキングに載せる商品と載せない商品、価格を取得するタイミングについて。',
  },
} as const;
type Slug = keyof typeof GUIDES;

export function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = GUIDES[slug as Slug];
  if (!g) return {};
  return { title: g.title, description: g.lead, alternates: { canonical: `/guide/${slug}` } };
}

export default async function Guide({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = GUIDES[slug as Slug];
  if (!g) notFound();
  return (
    <article className="prose">
      <nav className="crumbs" aria-label="パンくず"><Link href="/">トップ</Link> ＞ {g.h1}</nav>
      <h1>{g.h1}</h1>
      <p className="lead">{g.lead}</p>
      {slug === 'keisan' ? <Keisan /> : <Kijun />}
    </article>
  );
}

function Keisan() {
  return (
    <>
      <h2>基本の式</h2>
      <p className="formula">実質単価 ＝（価格 ＋ 送料 － クーポン － もらえるポイント）÷ 総量</p>
      <p>総量は「1つあたりの容量 × 個数」です。1440mlが3個なら4,320ml、64枚×4パックなら256枚として計算します。</p>
      <h2>ポイントは2つに分けて考える</h2>
      <p>
        ひとつは商品ページに表示されているポイント（Amazonの「〇pt」、楽天の「ポイント〇倍」、Yahoo!の「+〇%」）。
        もうひとつは、楽天カード払いやSPU、PayPay払い、Amazonカード払いのように、ページには出ないけれど自分の支払い方法で必ず付く分です。
        当サイトでは後者を「いつもの上乗せ」として一度登録すれば、すべての比較に反映されます。
      </p>
      <h2>注意しておきたいこと</h2>
      <ul>
        <li>ポイントは後日付与で、付与上限やエントリー条件がある場合があります。実質単価はあくまで目安です。</li>
        <li>ポイントは1ポイント＝1円として計算しています。</li>
        <li>送料無料になる金額の条件があるショップでは、まとめ買いの数によって順位が変わることがあります。</li>
      </ul>
      <p><Link href="/">比較ツールで計算する</Link></p>
    </>
  );
}

function Kijun() {
  return (
    <>
      <h2>対象にしている商品</h2>
      <ul>
        <li>楽天市場とYahoo!ショッピングで、送料無料（送料込み）・在庫ありの商品</li>
        <li>商品名から容量と個数を読み取れた商品</li>
      </ul>
      <h2>除外している商品</h2>
      <ul>
        <li>お試しサイズ、サンプル、空ボトルなど、比較の対象にならない商品</li>
        <li>カテゴリと単位の種類が合わない商品（例：柔軟剤のランキングに入ったビーズ型の加香剤）</li>
        <li>送料が別にかかる商品（送料が住所や合計金額で変わるため）</li>
      </ul>
      <h2>Amazonについて</h2>
      <p>Amazonの価格は、表示に関する規約の条件を満たすまでランキングに掲載していません。比較ツールでは、ご自身で入力した価格で比べられます。</p>
      <h2>更新タイミング</h2>
      <p>価格とポイントは1日1回取得しています。掲載件数が少ない日は、検索結果に表示されないよう設定しています。購入前に、各ショップのページで最新の価格とポイント条件を必ずご確認ください。</p>
    </>
  );
}
