# Stripe Setup Guide

Blindfold Chess の有料プラン（$1/month 広告非表示）を動作させるための
Stripe ダッシュボード設定手順。

## Prerequisites

- [Stripe アカウント](https://dashboard.stripe.com/register)
- Stripe CLI（ローカル開発用）: `brew install stripe/stripe-cli/stripe`

## 1. API Keys の取得

### テスト環境

1. [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) > Developers > API keys
2. 以下のキーをコピー:
   - **Secret key** (`sk_test_...`) → `.env.local` の `STRIPE_SECRET_KEY`
   - Publishable key は不要（Checkout リダイレクト方式では使わない）

### 本番環境

1. [Stripe Dashboard](https://dashboard.stripe.com/apikeys) > Developers > API keys
2. Secret key (`sk_live_...`) → Vercel の環境変数 `STRIPE_SECRET_KEY`

## 2. Product & Price の作成

### テスト環境

1. [Stripe Dashboard](https://dashboard.stripe.com/test/products) > Products > + Add product
2. 以下を設定:
   - **Name**: `Ad-Free Plan`（または任意の名前）
   - **Description**: `Remove all advertisements from Blindfold Chess`（任意）
3. Pricing:
   - **Pricing model**: Standard pricing
   - **Price**: `$1.00`
   - **Billing period**: `Monthly`
   - **Currency**: `USD`
4. Save product
5. 作成された Price の ID (`price_...`) をコピー → `.env.local` の `STRIPE_PRICE_ID`

### 本番環境

同様の手順をライブモードで実行。Price ID は異なるため、
Vercel の環境変数に本番用の `STRIPE_PRICE_ID` を設定する。

> **Note**: テスト環境と本番環境で Price ID は異なります。
> 環境ごとに正しい値を設定してください。

## 3. Webhook の設定

### ローカル開発（Stripe CLI）

```bash
# Stripe CLI にログイン
stripe login

# Webhook をローカルに転送
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 出力される webhook signing secret (whsec_...) をコピー
# → .env.local の STRIPE_WEBHOOK_SECRET
```

Stripe CLI は起動中のみ Webhook を転送します。
開発中は別ターミナルで起動しておいてください。

### テスト用イベントの送信

```bash
# Checkout 完了イベントをシミュレート
stripe trigger checkout.session.completed

# サブスクリプション更新イベント
stripe trigger customer.subscription.updated

# サブスクリプション削除イベント
stripe trigger customer.subscription.deleted
```

### 本番環境（Stripe Dashboard）

1. [Stripe Dashboard](https://dashboard.stripe.com/webhooks) > Developers > Webhooks
2. **+ Add endpoint** をクリック
3. 以下を設定:
   - **Endpoint URL**: `https://www.blindfold-chess.online/api/stripe/webhook`
   - **Events to send**:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. **Add endpoint** で保存
5. エンドポイント詳細画面の **Signing secret** (`whsec_...`) をコピー
   → Vercel の環境変数 `STRIPE_WEBHOOK_SECRET`

> **Important**: 本番とローカルの webhook secret は異なります。
> ローカルでは Stripe CLI が生成する secret、本番ではダッシュボードの secret を使います。

## 4. Customer Portal の設定

1. [Stripe Dashboard](https://dashboard.stripe.com/test/settings/billing/portal) > Settings > Billing > Customer portal
2. 以下を設定:

### Business information

- **Privacy policy**: `https://www.blindfold-chess.online/en/privacy`
- **Terms of service**: `https://www.blindfold-chess.online/en/terms`

### Subscriptions > Cancellations

- **Cancel subscriptions**: Enabled
- **Cancellation reason**: Enabled（任意。解約理由の収集）
- **Proration behavior**: `None`（月額$1 のため日割り不要）

### Subscriptions > Subscription updates

- **Switching plans**: Disabled（現時点では単一プラン）
- **Plan quantities**: Disabled

### Payment methods

- **Update payment methods**: Enabled

### Invoices

- **Invoice history**: Enabled

3. **Save changes**

## 5. 環境変数まとめ

### ローカル開発 (`.env.local`)

```env
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXX  # Stripe CLI の出力値
STRIPE_PRICE_ID=price_XXXXXXXXXXXXXXXXXXXX         # テスト環境の Price ID
```

### 本番 (Vercel Environment Variables)

```
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXX  # Dashboard Webhook の Signing secret
STRIPE_PRICE_ID=price_XXXXXXXXXXXXXXXXXXXX         # 本番環境の Price ID
```

> **Security**: `STRIPE_SECRET_KEY` は絶対に `NEXT_PUBLIC_` prefix をつけないでください。
> サーバーサイドのみで使用します。

## 6. 動作確認チェックリスト

### テスト環境での確認

- [ ] Product & Price が Stripe Dashboard で作成済み
- [ ] 環境変数が `.env.local` に正しく設定されている
- [ ] `stripe listen` でローカル Webhook が転送されている
- [ ] Pricing ページ (`/pricing`) が正しく表示される
- [ ] "Subscribe" ボタンで Stripe Checkout にリダイレクトされる
- [ ] テストカード (`4242 4242 4242 4242`) で決済が完了する
- [ ] Webhook が受信され、`subscriptions` テーブルにレコードが作成される
- [ ] 広告が非表示になる
- [ ] `/mypage/subscription` でサブスクリプション状態が表示される
- [ ] "Manage subscription" で Customer Portal にリダイレクトされる
- [ ] Customer Portal で解約すると `cancel_at_period_end` が true になる
- [ ] 解約予定の表示が正しい

### Stripe テストカード

| カード番号            | 用途                   |
| --------------------- | ---------------------- |
| `4242 4242 4242 4242` | 成功する決済           |
| `4000 0000 0000 0341` | 決済失敗（カード拒否） |
| `4000 0000 0000 3220` | 3D Secure 認証あり     |

有効期限: 未来の任意の日付、CVC: 任意の3桁

### 本番移行チェックリスト

- [ ] 本番用 Product & Price を作成済み
- [ ] 本番用 Webhook エンドポイントを登録済み
- [ ] Customer Portal を設定済み（利用規約・プライバシーポリシーのリンク）
- [ ] Vercel に本番用環境変数を設定済み
  - [ ] `STRIPE_SECRET_KEY` (sk*live*...)
  - [ ] `STRIPE_WEBHOOK_SECRET` (whsec\_...)
  - [ ] `STRIPE_PRICE_ID` (price\_...)
- [ ] テスト決済が成功する（Stripe テストモードのカードではなく、実カードまたは Stripe の本番テスト機能を使用）
- [ ] Webhook イベントが Dashboard で正常に配信されている（Webhook logs で確認）

## Troubleshooting

### Webhook 署名検証エラー

```
Webhook signature verification failed
```

- `.env.local` の `STRIPE_WEBHOOK_SECRET` が `stripe listen` 出力の値と一致しているか確認
- 本番では Dashboard の Webhook エンドポイント詳細にある Signing secret を使用
- ローカルの secret と本番の secret は異なる

### Checkout セッション作成エラー

- `STRIPE_PRICE_ID` が正しい環境（テスト/本番）の値か確認
- テスト環境の Price ID は `price_xxx` で始まり、本番も同様だが値は異なる

### Customer Portal が表示されない

- Customer Portal が Stripe Dashboard で有効化されているか確認
- Settings > Billing > Customer portal で設定が保存されているか確認
