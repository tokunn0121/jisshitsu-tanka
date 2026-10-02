import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Zen_Kaku_Gothic_New, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import ConditionsProvider from '@/components/ConditionsProvider';
import ConditionsChip from '@/components/ConditionsChip';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const zen = Zen_Kaku_Gothic_New({ weight: ['400', '500', '700', '900'], subsets: ['latin'], display: 'swap', variable: '--f-ja', preload: false });
const barlow = Barlow_Condensed({ weight: ['500', '600', '700'], subsets: ['latin'], display: 'swap', variable: '--f-num' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}｜送料・ポイント込みの1mlあたり・1枚あたりで比較`, template: `%s｜${SITE_NAME}` },
  description:
    'Amazon・楽天市場・Yahoo!ショッピングの日用品を、送料・クーポン・ポイント還元まで含めた実質単価で比べられる無料ツールと、毎日更新の実質単価ランキング。',
  openGraph: { siteName: SITE_NAME, type: 'website', locale: 'ja_JP' },
  alternates: { canonical: '/' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F4F7' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1626' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${zen.variable} ${barlow.variable}`}>
      <body>
        <ConditionsProvider>
          <header className="site">
            <div className="wrap hbar">
              <Link href="/" className="logo">
                {SITE_NAME}
              </Link>
              <ConditionsChip />
            </div>
            <nav className="wrap gnav" aria-label="メイン">
              <Link href="/rank">ランキング</Link>
              <Link href="/">比較ツール</Link>
              <Link href="/my">わたしの記録</Link>
              <Link href="/guide/keisan">計算のしかた</Link>
            </nav>
          </header>
          <main className="wrap">{children}</main>
          <footer className="site">
            <div className="wrap">
              <p className="small">当サイトはアフィリエイト広告を利用しています。掲載価格とポイントは取得時点のもので、購入時の金額は各ショップでご確認ください。</p>
              <nav className="fnav" aria-label="サイト情報">
                <Link href="/guide/kijun">掲載基準</Link>
                <Link href="/about">運営者情報</Link>
              </nav>
              <p className="small muted">
                <a href="https://webservice.rakuten.co.jp/" target="_blank" rel="noopener noreferrer">Supported by Rakuten Developers</a>
                ／Web Services by Yahoo! JAPAN
              </p>
            </div>
          </footer>
        </ConditionsProvider>
      </body>
    </html>
  );
}
