import { SITE_URL } from '../site';

export type RawItem = {
  source: 'rakuten' | 'yahoo';
  id: string;
  name: string;
  price: number;
  url: string;
  affiliateUrl?: string;
  image?: string;
  shop: string;
  pointPct: number; // 商品ページ表示のポイント（%）
  pointAmount: number; // 商品ページ表示のポイント（pt）
  freeShipping: boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 楽天市場商品検索API。送料込み（postageFlag=1）・在庫ありのみ取得
export async function searchRakuten(keyword: string, pages = 2, fresh = false): Promise<RawItem[]> {
  const appId = process.env.RAKUTEN_APP_ID;
  const accessKey = process.env.RAKUTEN_ACCESS_KEY;
  if (!appId || !accessKey) return [];
  const endpoint =
    process.env.RAKUTEN_ITEM_SEARCH_URL || 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401';
  const out: RawItem[] = [];
  for (let page = 1; page <= pages; page++) {
    const p = new URLSearchParams({
      format: 'json',
      formatVersion: '2',
      applicationId: appId,
      accessKey,
      keyword,
      hits: '30',
      page: String(page),
      postageFlag: '1',
      availability: '1',
    });
    if (process.env.RAKUTEN_AFFILIATE_ID) p.set('affiliateId', process.env.RAKUTEN_AFFILIATE_ID);
    try {
      const res = await fetch(`${endpoint}?${p}`, {
        headers: { Referer: `${SITE_URL}/`, Origin: SITE_URL },
        ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 86400 } }),
      });
      if (!res.ok) {
        console.error('[rakuten]', res.status, await res.text().catch(() => ''));
        break;
      }
      const json: any = await res.json();
      const items: any[] = json.Items || json.items || [];
      for (const raw of items) {
        const it = raw.Item || raw; // formatVersion 1/2 の両方に対応
        out.push({
          source: 'rakuten',
          id: `r:${it.itemCode}`,
          name: String(it.itemName || ''),
          price: Number(it.itemPrice) || 0,
          url: it.itemUrl,
          affiliateUrl: it.affiliateUrl || undefined,
          image: Array.isArray(it.mediumImageUrls)
            ? typeof it.mediumImageUrls[0] === 'string'
              ? it.mediumImageUrls[0]
              : it.mediumImageUrls[0]?.imageUrl
            : undefined,
          shop: String(it.shopName || ''),
          pointPct: Number(it.pointRate) || 1, // 倍率＝%（1倍＝1%）
          pointAmount: 0,
          freeShipping: Number(it.postageFlag) === 0, // 0: 送料込み
        });
      }
      if (items.length < 30) break;
    } catch (e) {
      console.error('[rakuten] fetch failed', e);
      break;
    }
    await sleep(1100); // 1秒1回の目安を守る
  }
  return out;
}
