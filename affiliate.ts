import { AFFILIATE_ENABLED } from './site';

// テンプレートの {url} を商品URLに差し替える（もしもの「どこでもリンク」等）
function fromTemplate(tpl: string | undefined, url: string): string | null {
  if (!tpl || !tpl.includes('{url}')) return null;
  return tpl.replace('{url}', encodeURIComponent(url));
}

export type Link = { href: string; sponsored: boolean };

export function rakutenLink(itemUrl: string, affiliateUrl?: string): Link {
  // 楽天のAPIデータで収益を得る場合は楽天アフィリエイト（本家）経由にする
  if (AFFILIATE_ENABLED && affiliateUrl) return { href: affiliateUrl, sponsored: true };
  return { href: itemUrl, sponsored: false };
}
export function yahooLink(itemUrl: string): Link {
  const a = AFFILIATE_ENABLED ? fromTemplate(process.env.MOSHIMO_YAHOO_LINK_TEMPLATE, itemUrl) : null;
  return a ? { href: a, sponsored: true } : { href: itemUrl, sponsored: false };
}
export function amazonSearchLink(keyword: string): Link {
  const url = `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`;
  const a = AFFILIATE_ENABLED ? fromTemplate(process.env.MOSHIMO_AMAZON_LINK_TEMPLATE, url) : null;
  return a ? { href: a, sponsored: true } : { href: url, sponsored: false };
}
