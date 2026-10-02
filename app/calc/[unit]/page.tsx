import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Tool from '@/components/Tool';
import JsonLd from '@/components/JsonLd';
import { SITE_URL } from '@/lib/site';

const PAGES: Record<string, { unit: string; title: string; h1: string; lead: string; example: string; rank?: string }> = {
  ml: {
    unit: 'ml',
    title: '1mlあたりの値段を計算｜送料・ポイント込みで比べる',
    h1: '1mlあたりの値段を、送料とポイント込みで計算',
    lead: '詰め替えの柔軟剤や洗剤のように、容量と個数が違う商品を1ml・100ml・1Lあたりの実質価格に揃えて比べます。',
    example: '例：1,043円・960ml・10ポイントなら、(1,043−10)÷960＝約1.08円/ml。',
    rank: 'junanzai-tsumekae',
  },
  g: {
    unit: 'g',
    title: '1gあたりの値段を計算｜送料・ポイント込みで比べる',
    h1: '1gあたりの値段を、送料とポイント込みで計算',
    lead: '粉末洗剤やお米のように重さで売られている商品を、1g・100g・1kgあたりの実質価格に揃えて比べます。',
    example: '例：2,980円・5kg・送料無料・1%還元なら、(2,980−29.8)÷5,000＝約0.59円/g。',
  },
  mai: {
    unit: '枚',
    title: '1枚あたりの値段を計算｜おむつ・ティッシュをポイント込みで比べる',
    h1: '1枚あたりの値段を、送料とポイント込みで計算',
    lead: 'おむつやおしりふきのように「64枚×4パック」で売られている商品を、1枚あたりの実質価格に揃えて比べます。',
    example: '例：4,480円・64枚×4パック・44ポイントなら、(4,480−44)÷256＝約17.3円/枚。',
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((unit) => ({ unit }));
}
export async function generateMetadata({ params }: { params: Promise<{ unit: string }> }): Promise<Metadata> {
  const { unit } = await params;
  const p = PAGES[unit];
  if (!p) return {};
  return { title: p.title, description: p.lead, alternates: { canonical: `/calc/${unit}` } };
}

export default async function CalcPage({ params }: { params: Promise<{ unit: string }> }) {
  const { unit } = await params;
  const p = PAGES[unit];
  if (!p) notFound();
  return (
    <>
      <nav className="crumbs" aria-label="パンくず"><Link href="/">トップ</Link> ＞ {p.h1}</nav>
      <h1>{p.h1}</h1>
      <p className="lead">{p.lead}</p>
      <Tool defaultUnit={p.unit} />
      <h2>計算のしかた</h2>
      <p className="formula">（価格＋送料－クーポン－もらえるポイント）÷ 総量<br /><span className="muted small">{p.example}</span></p>
      <p className="small">
        <Link href="/guide/keisan">ポイントの数え方や、楽天・Yahoo!・Amazonの違いはこちら</Link>
      </p>
      {p.rank && (
        <p className="small"><Link href={`/rank/${p.rank}`}>今日の柔軟剤 詰め替えの実質単価ランキングを見る</Link></p>
      )}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'トップ', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: p.h1, item: `${SITE_URL}/calc/${unit}` },
          ],
        }}
      />
    </>
  );
}
