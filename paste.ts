import { detectShop, type Shop } from './parse';

// 共有メニューからコピーした文字列（「商品名 https://...」）を商品名とURLに分ける
export function splitPaste(text: string): { url: string; name: string; shop: Shop | null } {
  const urlMatch = text.match(/https?:\/\/[^\s　]+/);
  const url = urlMatch ? urlMatch[0] : '';
  let name = text.replace(url, ' ').replace(/[\s　]+/g, ' ').trim();
  const shop = url ? detectShop(url) : null;
  name = name
    .replace(/^Amazon\.co\.jp\s*[:：]\s*/i, '')
    .replace(/\s*[:：]\s*(ドラッグストア|ホーム&キッチン|食品・飲料・お酒|ベビー&マタニティ|ペット用品|ビューティー)\s*$/, '')
    .replace(/^【楽天市場】\s*/, '')
    .replace(/\s*[-－]\s*Yahoo!ショッピング\s*$/, '')
    .trim();
  if (shop === 'rakuten') name = name.replace(/[：:][^：:]{1,40}$/, '').trim(); // 末尾のショップ名
  return { url, name, shop };
}
