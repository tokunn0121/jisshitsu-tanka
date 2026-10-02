import type { MetadataRoute } from 'next';
import { CATEGORIES } from '@/lib/categories';
import { getRanking } from '@/lib/rank';
import { SITE_URL } from '@/lib/site';

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed = ['/', '/rank', '/calc/ml', '/calc/g', '/calc/mai', '/guide/keisan', '/guide/kijun'].map((p) => ({
    url: `${SITE_URL}${p === '/' ? '' : p}`,
    lastModified: now,
  }));
  const ranks: MetadataRoute.Sitemap = [];
  for (const c of CATEGORIES) {
    const r = await getRanking(c.slug);
    if (r?.indexable) ranks.push({ url: `${SITE_URL}/rank/${c.slug}`, lastModified: new Date(r.fetchedAt), changeFrequency: 'daily' });
  }
  return [...fixed, ...ranks];
}
