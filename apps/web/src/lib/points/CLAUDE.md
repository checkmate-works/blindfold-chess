# Points / Coin ledger (コイン) — retired

The coin economy was retired in 2026-11 because nobody used it: 143 of 1,432
users held a balance, the median was 2 coins, and three users spent anything in
its last 90 days. Likes were meant to be the incentive to earn; the community
did not pick that up.

**Nothing mints or spends coins any more.** Do not add a feature that does.

## What is left, and why

| Piece                                                                                                                                   | Why it still exists                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `point_events`, `user_point_balances`, `point_redemptions`, `point_purchases`, `point_batch_watermarks` (`src/lib/db/schema/points.ts`) | The ledger rows are the record of what users held. Dropped in a follow-up migration once the balance conversion has run and been checked. |
| `/admin/coins`, the Coins card on `/admin/users/[id]`, `list-events.ts`, `get-history.ts`, `get-balance.ts`                             | Read-only views of the frozen ledger, for checking the conversion.                                                                        |
| `games.maia_charge_id` and the `maiaChargeId` plumbing on saved / published games                                                       | Linked a Maia game to the coin that paid for it. Inert now; removed together with the column.                                             |
| `point_grant` / `like_coin_grant` notification types                                                                                    | Rows already in users' notification lists still render their text; they link nowhere.                                                     |

All of it goes when the tables are dropped. Until then, treat this directory
as read-only.

## What replaced each spend

- **AI review** — subscribers only (`resolveAiReviewGenerationState`).
- **Maia** — Lv5 and up (`MAIA_UNLOCK_LEVEL`). The players who had paid a coin
  for Maia were raised to Lv5 with a one-off Exp grant
  (`scripts/retire-coins/grant-maia-carryover-exp.sql`).
- **Kata visibility tiers** — free for everyone.
- **Ad-free redemption** — removed; leftover balances are converted once, at
  the old rate of 1 coin = 1 day, by
  `scripts/retire-coins/convert-balances.sql`.

## Naming, for reading the leftovers

"Coin" was the user- and staff-facing name; "points" is the ledger primitive
in the schema and this service layer. Same unit, 1:1. The
`point_events.source` / `category` strings are stored data values — the
read views map them to labels (`classifyKind` in `get-history.ts`).
