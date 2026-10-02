import Link from 'next/link';
import Tool from '@/components/Tool';
import CategoryBoard from '@/components/CategoryBoard';

export const revalidate = 86400;

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>送料もポイントもこみで、いちばん安いのはどれ？</h1>
        <p className="lead">
          容量も個数もバラバラな詰め替えやケース買いを、あなたのポイント条件での「1mlあたり」「1枚あたり」に揃えて比べます。Amazon・楽天・Yahoo!に対応。
        </p>
      </section>
      <Tool />

      <section aria-labelledby="h-board">
        <h2 id="h-board">今日の最安（毎日更新）</h2>
        <p className="muted small">楽天市場とYahoo!ショッピングの送料無料商品から、ポイント込みで計算しています。</p>
        <CategoryBoard />
        <p className="small"><Link href="/rank">ランキングの一覧へ</Link></p>
      </section>

      <section aria-labelledby="h-how">
        <h2 id="h-how">使い方</h2>
        <ol className="steps">
          <li><b>貼る</b>：ショップのアプリで「共有」→「コピー」した文字を、上の欄に貼ります。</li>
          <li><b>価格を入れる</b>：価格と、ページに出ているポイントを入れます。容量と個数は自動で入ります。</li>
          <li><b>比べる</b>：2つ以上そろうと、実質単価の安い順に並びます。保存しておけば次回は価格を直すだけです。</li>
        </ol>
        <p className="small"><Link href="/guide/keisan">計算のしかたを詳しく見る</Link></p>
      </section>
    </>
  );
}
