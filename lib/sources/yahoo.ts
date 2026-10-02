import type { RawItem } from './rakuten';

// Yahoo!ショッピング 商品検索（v3）
export async function searchYahoo(keyword: string, fresh = false): Promise<RawItem[]> {
  const appid = process.env.YAHOO_APP_ID;
  if (!appid) return [];
  const p = new URLSearchParams({ appid, query: keyword, results: '50', in_stock: 'true' });
  try {
    const endpoint = process.env.YAHOO_ITEM_SEARCH_URL || 'https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch';
    const res = await fetch(`${endpoint}?${p}`, {
      ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 86400 } }),
    });
    if (!res.ok) {
      console.error('[yahoo]', res.status, await res.text().catch(() => ''));
      return [];
    }
    const json: any = await res.json();
    const hits: any[] = json.hits || [];
    return hits.map((h) => ({
      source: 'yahoo' as const,
      id: `y:${h.code}`,
      name: String(h.name || ''),
      price: Number(h.price) || 0,
      url: h.url,
      image: h.image?.medium,
      shop: String(h.seller?.name || ''),
      pointPct: 0,
      pointAmount: Number(h.point?.amount) || 0, // 表示上の付与ポイント
      freeShipping: Number(h.shipping?.code) === 2, // 2: 送料無料
    }));
  } catch (e) {
    console.error('[yahoo] fetch failed', e);
    return [];
  }
}
