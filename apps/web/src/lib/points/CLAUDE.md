# Points / Coin Economy (コイン)

The in-app currency has **two names for one thing**, by deliberate design:

- **"Coin"** — the product/brand name. This is the ONLY term users and staff
  ever see (web UI, admin UI, FAQ, notifications, i18n copy).
- **"points"** — the internal ledger primitive. Used only in the DB schema and
  this `@/lib/points` service layer. Never surfaced to a human.

They are the same unit, 1:1. There is no conversion between them.

## Why two names

1. **Disambiguation from EXP (経験値).** The app already has experience points
   (`exp_events` / `user_exp`), which a user could also call "points." Naming
   the spendable currency "Coin" keeps the two economies verbally distinct.
2. **Brand vs. implementation.** `point_events` is a generic signed-delta
   ledger (mirrors `exp_events`); "Coin" is the concrete thing that ledger
   happens to back. Keeping the ledger name generic costs nothing and avoids a
   large, risky rename of schema / RLS / FKs.

## Layer map

| Layer         | Term       | Concrete names                                                                                                |
| ------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| DB schema     | **points** | `point_events`, `user_point_balances`, `point_redemptions`, `point_purchases` (`src/lib/db/schema/points.ts`) |
| Service layer | **points** | `@/lib/points`, `grantAdminPoints`, `getPointBalanceSummary`, `getPointHistory`                               |
| Admin UI      | **Coin**   | route `/admin/coins`, nav "Coins", i18n `Admin.coins`                                                         |
| User UI       | **Coin**   | `/mypage/coins`, FAQ `/coin`, i18n `coin` / `MypagePoints` (title "Coins")                                    |

## Rules when extending

- A new **facing surface** (page, label, copy) is always "Coin." Do NOT add a
  user- or admin-visible string that says "Points."
- New **ledger / service** code stays "points" (`point_events`, `@/lib/points`).
- The `point_events.source` / `category` string values (`'admin_grant'`,
  `'like_grant'`, `'maia_game'`, `'redemption'`, `'earned'`, …) and the
  `MypagePoints.history.kind` i18n keys are **stored data values** — never
  rename them; a rename would orphan existing rows. Map them to display labels
  at the read layer instead (see `classifyKind` in `get-history.ts`).
- Admin transaction visibility is a **read surface over `point_events`**, not a
  new log: see `listPointEvents` (`list-events.ts`) and the per-user Coins card
  on `/admin/users/[id]`. Do not duplicate coin movements into
  `moderation_actions` / `user_activity_log` (that splits the source of truth).
