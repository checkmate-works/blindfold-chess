-- Drops what is left of the retired coin economy: the five ledger tables, the
-- `games.maia_charge_id` link column, and the coin notifications.
--
-- The ledger is the only record of two things users are owed, and each is
-- settled by a one-off script that READS these tables
-- (apps/web/scripts/retire-coins/):
--
--   * convert-balances.sql turns every leftover balance into ad-free days
--     (1 coin = 1 day). Until it has run, `user_point_balances` still holds
--     non-zero rows.
--   * grant-maia-carryover-exp.sql raises everyone who ever paid a coin for
--     Maia to the level that now unlocks it. Lv5 starts at 1118 Exp
--     (floor(100 × 5^1.5), the level curve in packages/features/src/exp), and
--     the script writes one `exp_events` row with
--     `source = 'maia_access_carryover'` per player it raises. Until it has
--     run, some player with a `maia_game` ledger row is below 1118 Exp and
--     has no such row.
--
-- Dropping the tables first would make both scripts impossible to run and the
-- balances unrecoverable, so the guard below refuses to continue while either
-- is outstanding. Drizzle applies a migration inside a transaction, so the
-- exception leaves the database exactly as it was. A database that never had
-- coins (local, a Preview branch) has no such rows and passes straight through.
DO $$
DECLARE
  unlock_exp CONSTANT integer := 1118;
  open_holders integer;
  open_coins bigint;
  locked_out integer;
BEGIN
  SELECT count(DISTINCT user_id), coalesce(sum(balance), 0)
  INTO open_holders, open_coins
  FROM user_point_balances
  WHERE balance <> 0;

  IF open_holders > 0 THEN
    RAISE EXCEPTION
      'Refusing to drop the coin ledger: % user(s) still hold a non-zero balance (% coin(s) net).', open_holders, open_coins
      USING HINT = 'Run apps/web/scripts/retire-coins/convert-balances.sql first, then migrate again.';
  END IF;

  -- A payer who is below the threshold but already has a carryover row was
  -- raised and has since lost Exp some other way (a removed challenge result
  -- rebuilds the total); the script would skip them too, so they do not block.
  SELECT count(*)
  INTO locked_out
  FROM (SELECT DISTINCT user_id FROM point_events WHERE source = 'maia_game') payer
  LEFT JOIN user_exp e ON e.user_id = payer.user_id
  WHERE coalesce(e.total_exp, 0) < unlock_exp
    AND NOT EXISTS (
      SELECT 1 FROM exp_events x
      WHERE x.user_id = payer.user_id AND x.source = 'maia_access_carryover'
    );

  IF locked_out > 0 THEN
    RAISE EXCEPTION
      'Refusing to drop the coin ledger: % player(s) who paid coins for Maia are still below % Exp and would lose the engine.', locked_out, unlock_exp
      USING HINT = 'Run apps/web/scripts/retire-coins/grant-maia-carryover-exp.sql first, then migrate again.';
  END IF;
END $$;
--> statement-breakpoint
-- Coin notifications ("you received N coins", "your content was liked — you
-- earned N coins"). Nothing has emitted them since the coin economy was
-- retired, the app no longer has a message or a link for either type, and
-- what they announced no longer exists. `notifications.type` is a plain
-- varchar, so there is no enum value or CHECK constraint to remove with them.
DELETE FROM "notifications" WHERE "type" IN ('point_grant', 'like_coin_grant');--> statement-breakpoint
ALTER TABLE "point_batch_watermarks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "point_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "point_purchases" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "point_redemptions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_point_balances" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "point_batch_watermarks" CASCADE;--> statement-breakpoint
DROP TABLE "point_events" CASCADE;--> statement-breakpoint
DROP TABLE "point_purchases" CASCADE;--> statement-breakpoint
DROP TABLE "point_redemptions" CASCADE;--> statement-breakpoint
DROP TABLE "user_point_balances" CASCADE;--> statement-breakpoint
DROP INDEX "idx_games_maia_charge";--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "maia_charge_id";
