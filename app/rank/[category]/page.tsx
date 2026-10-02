import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';
import { getRanking, rankStats } from '@/lib/rank';
import { getHistory } from '@/lib/history';
import CategoryHistory from '@/components/CategoryHistory';
import { unitYen } from '@/lib/units';
import { amazonSearchLink } from '@/lib/affiliate';
import { SITE_URL } from '@/lib/site';
import RankList from '@/components/RankList';
import JsonLd from '@/components/JsonLd';

export const revalidate = 86400; // 1日1回作り直す

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const r = await getRanking(category);
  if (!r) return {};
  const c = r.category;
  return {
    title: `${c.short}の最安は？ポイント込み${c.baseLabel}あたりの実質単価ランキング`,
    description: c.description,
    alternates: { canonical: `/rank/${c.slug}` },
    // 掲載が少ない・取得できていない日は検索に載せない
    robots: r.indexable ? undefined : { index: false, follow: true },
  };
}

function jst(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default async function RankPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const r = await getRanking(category);
  if (!r) notFound();
  const c = r.category;
  const amz = amazonSearchLink(c.query);
  const stats = rankStats(r.items);
  const history = await getHistory(c.slug, 90);

  return (
    <>
      <nav className="crumbs" aria-label="パンくず">
        <Link href="/">トップ</Link> ＞ <Link href="/rank">ランキング</Link> ＞ {c.short}
      </nav>
      <h1>{c.name}</h1>
      <p className="lead">{c.description}</p>

      <nav className="catchips" aria-label="ほかのカテゴリ">
        {CATEGORIES.map((x) => (
          <Link key={x.slug} href={`/rank/${x.slug}`} aria-current={x.slug === c.slug ? 'page' : undefined}>{x.short}</Link>
        ))}
      </nav>

      {stats && (
        <dl className="stats">
          <div className="statbest">
            <dt>今日の最安</dt>
            <dd><b className="num">{unitYen(stats.min * c.base)}</b>円 / {c.baseLabel}</dd>
          </div>
          <div>
            <dt>相場（中央値）</dt>
            <dd><b className="num">{unitYen(stats.median * c.base)}</b>円</dd>
          </div>
          <div>
            <dt>最安は相場より</dt>
            <dd><b className="num">{((1 - stats.min / stats.median) * 100).toFixed(0)}</b>%安い</dd>
          </div>
        </dl>
      )}
      <p className="meta">
        最終取得：{jst(r.fetchedAt)}（毎日更新）／掲載 {r.items.length}件（楽天 {r.sources.rakuten}・Yahoo! {r.sources.yahoo}）。容量を確実に読み取れなかった{r.excluded}件は載せていません。相場と最安は商品ページのポイントだけで計算しています。
      </p>
      {r.items.length > 0 ? (
        <RankList slug={c.slug} items={r.items} base={c.base} baseLabel={c.baseLabel} bands={c.bands} />
      ) : (
        <p className="empty">現在このカテゴリの価格を取得できていません。時間をおいて確認してください。</p>
      )}
      {c.famNote && <p className="muted small">{c.famNote}</p>}

      <CategoryHistory slug={c.slug} history={history} todayStat={stats ? { min: stats.min, median: stats.median } : null} base={c.base} baseLabel={c.baseLabel} />

      <div className="amz">
        Amazonの価格はこのランキングに掲載していません。Amazonの商品と比べたいときは、商品名かURLを<Link href="/">比較ツール</Link>に貼ると、同じ条件で並べられます。
        <br />
        <a href={amz.href} target="_blank" rel={amz.sponsored ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}>
          Amazonで「{c.short}」を探す
        </a>
      </div>

      <h2>このランキングの決め方</h2>
      <p className="small">
        送料無料（送料込み）の商品だけを対象に、（価格 − 商品ページのポイント − あなたの上乗せポイント）÷ 総量 で並べています。
        詰め替え用ボトルやお試しサイズなど、比較の対象にならない商品は除外しています。詳しくは<Link href="/guide/kijun">掲載基準</Link>をご覧ください。
      </p>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'トップ', item: `${SITE_URL}/` },
              { '@type': 'ListItem', position: 2, name: 'ランキング', item: `${SITE_URL}/rank` },
              { '@type': 'ListItem', position: 3, name: c.short, item: `${SITE_URL}/rank/${c.slug}` },
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: c.name,
            itemListElement: r.items.slice(0, 10).map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name })),
          },
        ]}
      />
    </>
  );
}
