// 利用者ごとの「いつもの上乗せ」。ページに表示されないポイントを%で持つ
export type Conditions = {
  rakuten: number; // 楽天カード払い・SPUなど（商品ページ表示分を除く）
  yahoo: number; // PayPay払い・LYPなど
  amazon: number; // Amazonカード払いなど
  other: number;
  setupDone: boolean;
};
export const DEFAULT_CONDITIONS: Conditions = { rakuten: 0, yahoo: 0, amazon: 0, other: 0, setupDone: false };
export const SHOP_LABEL = { amazon: 'Amazon', rakuten: '楽天', yahoo: 'Yahoo!', other: 'その他' } as const;
export const EXTRA_HINT = {
  amazon: 'Amazonカード払いなど、商品ページに出ていない分',
  rakuten: '楽天カード払い・SPUなど、商品ページに出ていない分',
  yahoo: 'PayPay払いなど、商品ページに出ていない分',
  other: '支払い方法などで上乗せされる分',
} as const;
