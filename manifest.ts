import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '実質単価くらべ',
    short_name: '単価くらべ',
    description: '送料・ポイント込みの実質単価で日用品を比べる',
    start_url: '/',
    display: 'standalone',
    background_color: '#F2F4F7',
    theme_color: '#14213D',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
