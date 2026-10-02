import type { Fam } from './units';

export type Category = {
  slug: string;
  name: string; // ページ見出し
  short: string; // 一覧用の短い名前
  query: string; // API検索語
  fams: Fam[]; // 受け付ける単位の種類
  base: 1 | 100 | 1000; // 表示する単価の基準
  baseLabel: string;
  famNote?: string;
  total: [number, number]; // 1回の購入量の範囲（基準単位: ml / g / 個）
  unitSize?: [number, number]; // 1つあたりの容量の範囲（水2Lなど）
  exclude: RegExp; // 除外語
  bands: { label: string; min: number; max: number }[]; // 1回に買う量の目安
  description: string;
  keywords: string[];
};

export const CATEGORIES: Category[] = [
  {
    slug: 'junanzai-tsumekae',
    name: '柔軟剤 詰め替えの実質単価ランキング',
    short: '柔軟剤 詰め替え',
    query: '柔軟剤 詰め替え',
    fams: ['vol', 'wt'],
    base: 100,
    baseLabel: '100ml',
    famNote: 'g表記の商品は1g＝1mlとして換算しています。',
    total: [300, 30000],
    exclude: /サンプル|お試し|本体のみ|ボトル単品|香水|ミスト|スプレー|ビーズ|加香剤|空ボトル|詰め替え用ボトル/,
    bands: [{ label: '〜2L', min: 0, max: 2001 }, { label: '2〜5L', min: 2001, max: 5001 }, { label: '5L〜', min: 5001, max: 1e9 }],
    description:
      '柔軟剤の詰め替えを、楽天市場とYahoo!ショッピングの送料無料商品から、ポイント還元まで含めた100mlあたりの実質単価で毎日比較しています。',
    keywords: ['柔軟剤 詰め替え 最安', '柔軟剤 詰め替え 安い 通販', '柔軟剤 1mlあたり'],
  },
  {
    slug: 'sentakuzai-ekitai-tsumekae',
    name: '液体洗濯洗剤 詰め替えの実質単価ランキング',
    short: '液体洗濯洗剤 詰め替え',
    query: '洗濯洗剤 液体 詰め替え',
    fams: ['vol', 'wt'],
    base: 100,
    baseLabel: '100ml(g)',
    famNote: '液体洗剤はmlとgの表記が混在するため、1g＝1mlとして換算しています。',
    total: [300, 30000],
    exclude: /サンプル|お試し|ジェルボール|粉末|柔軟剤|漂白剤|本体のみ|空ボトル|おしゃれ着/,
    bands: [{ label: '〜2L', min: 0, max: 2001 }, { label: '2〜5L', min: 2001, max: 5001 }, { label: '5L〜', min: 5001, max: 1e9 }],
    description:
      '液体の洗濯洗剤の詰め替えを、送料無料の商品だけに絞り、ポイント還元込みの100mlあたりの実質単価で毎日比較しています。',
    keywords: ['洗濯洗剤 詰め替え 最安', '洗濯洗剤 詰め替え 大容量 安い', '液体洗剤 1mlあたり'],
  },
  {
    slug: 'water-2l',
    name: '水 2L ケースの実質単価ランキング',
    short: '水 2L ケース',
    query: '水 2L 12本 送料無料',
    fams: ['vol'],
    base: 1000,
    baseLabel: '1L',
    total: [6000, 60000],
    unitSize: [1900, 2100],
    exclude: /ウォーターサーバー|炭酸|スパークリング|ジュース|お茶|麦茶|紅茶|コーヒー|ボトル単品|空/,
    bands: [{ label: '6本', min: 0, max: 12001 }, { label: '12本〜', min: 12001, max: 1e9 }],
    description:
      '2Lペットボトルの水のケース買いを、送料無料の商品から、ポイント還元込みの1Lあたりの実質単価で毎日比較しています。',
    keywords: ['水 2L ケース 最安', '水 2L 1本あたり 最安', 'ミネラルウォーター 2L 安い 通販'],
  },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
