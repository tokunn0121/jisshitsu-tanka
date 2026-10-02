# 実質単価くらべ

送料・クーポン・ポイント還元まで含めた「実質単価」で日用品を比べるサイト。

## ページ構成

| URL | 役割 | 検索への載せ方 |
|---|---|---|
| `/` | 比較ツール（URL・商品名を貼って比べる） | 載せる |
| `/calc/ml` `/calc/g` `/calc/mai` | 「1mlあたり 計算」などの入口 | 載せる |
| `/rank` | ランキング一覧 | 載せる |
| `/rank/[カテゴリ]` | 楽天・Yahoo!から毎日取得した実質単価ランキング | 掲載10件以上のときだけ載せる（自動） |
| `/guide/keisan` `/guide/kijun` | 計算方法・掲載基準 | 載せる |
| `/my` | わたしの購入記録（端末内に保存した「これを買った」と相場のグラフ） | 載せない |
| `/about` | 運営者情報・広告表記 | 載せない |

カテゴリの追加は `lib/categories.ts` に1件足すだけ。

## はじめかた

1. このフォルダをGitHubの新しいリポジトリにアップロード
2. Vercelで「Add New → Project」からImport（設定はそのままでOK）
3. 公開URLで楽天ウェブサービスのアプリ登録（許可するサイトに公開URLを入れる）とYahoo!デベロッパーネットワークのアプリ登録
4. Vercelの「Settings → Environment Variables」に `.env.example` の値を入れて再デプロイ

## 商品名の読み取り（精度が差別化の中心）

1. **ルール**（`lib/parse.ts`）：容量・個数・ケース数を読み、自信を high / mid / low で返す
2. **AI**（`lib/parse-ai.ts`）：high 以外だけをAIに読ませて照合する
   - mid：AIと総量が一致したときだけ採用（不一致なら載せない）
   - low：AIが「自信あり」と答えたときだけ採用
   - 結果はSupabaseの `parse_cache` に保存し、同じ商品名は二度とAIに送らない
   - `ANTHROPIC_API_KEY` が未設定なら、mid まで採用して low は載せない
3. **報告**：ランキングの各商品に「読み取り：1440ml × 3」と「違う？」ボタン。報告は `parse_reports` にたまる

### 精度の測り方

```
npm run eval              # 正解表（tests/gold.json）
npm run eval -- --holdout # 調整に使っていない確認用（tests/holdout.json）
npm run eval -- --ai      # AIの二段目も含めて測る（APIキーが必要）
```

- 採用したものの正答率（精度）を最優先する。誤って載せるより、載せない方がまし
- holdout は一度使ったら正解表に移し、実データ（`parse_reports` や除外された商品名）から新しい holdout を作る

## 推移グラフ（毎日の記録）

- 毎朝6時（日本時間）にVercel Cronが `/api/cron/snapshot` を呼び、カテゴリごとの最安と相場をSupabaseの `daily_stats` に保存する
- 準備：Supabaseで `supabase/migrations/001_daily_stats.sql` を実行し、`SUPABASE_URL` `SUPABASE_ANON_KEY` `SUPABASE_SERVICE_ROLE_KEY` `CRON_SECRET` を環境変数に入れる
- 記録は始めた日からしかたまらないので、公開したらすぐに設定しておく
- 「これを買った」の記録は各端末のブラウザ（localStorage）にだけ保存し、サーバーには送らない

## アフィリエイトを有効にする前に

- Vercelの無料（Hobby）プランは、アフィリエイトが主目的のサイトを商用利用として扱う。Proに切り替えてから `AFFILIATE_ENABLED=true` にする
- 楽天のAPIデータで収益を得る場合は楽天アフィリエイト（本家）のID（`RAKUTEN_AFFILIATE_ID`）を使う
- Amazonの価格はランキングに載せない（APIで取得した価格以外は表示できないため）

## 確認が必要な点

- 楽天APIのエンドポイントは版が更新されることがある。`RAKUTEN_ITEM_SEARCH_URL` で差し替えられる
- テスト用に `YAHOO_ITEM_SEARCH_URL` でYahoo!のエンドポイントも差し替えられる
- Yahoo!の送料無料判定は `shipping.code === 2` で行っている。実データで確認する
