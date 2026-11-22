-- Raise the players who paid coins for Maia to the level that unlocks it.
--
-- Purpose:
--   Until 2026-11 a player below Lv5 could play Maia for one coin per game.
--   The coin economy was retired and Maia is now gated on level alone
--   (`MAIA_UNLOCK_LEVEL` = 5), so a player who had been paying their way in
--   would lose the engine on release. This grants each such player exactly
--   the Exp that separates them from Lv5 — no more — so nobody who used Maia
--   is locked out of it. At the time of writing that is 5 of the 10 players
--   who ever paid; the other 5 are already past Lv5 and are left alone.
--
--   Exp rather than a per-user exemption because the level is already the
--   gate: nothing in the schema or the access check has to learn about a
--   special case, and the grant is an ordinary, auditable ledger row.
--
-- What it writes, per player who paid for Maia and is still below Lv5:
--   - `exp_events`: one row, `source = 'maia_access_carryover'`,
--     `amount` = 1118 − their current total. `created_at` is the time of
--     their first Maia charge, NOT now, so the grant does not put them on
--     this week's or this month's Exp leaderboard (those sum `exp_events`
--     over a `created_at` window). It does count toward the all-time total,
--     where it leaves them at the very bottom of the Lv5 band.
--   - `user_exp`: total raised to 1118.
--
--   1118 is `getExpForLevel(5)` = floor(100 × 5^1.5), from the level curve in
--   packages/features/src/exp (`EXP_CURVE`, `getExpForLevel`). If the curve
--   or `MAIA_UNLOCK_LEVEL` has changed since this was written, recompute it.
--
-- Prerequisites:
--   - `point_events` still holds the `maia_game` rows: run this BEFORE the
--     migration that drops the point tables.
--
-- How to run:
--   Execute in the Supabase SQL Editor, at or just before the release that
--   removes the coin charge — run later, those players see Maia locked in
--   the meantime. One transaction: all or nothing.
--   Idempotent — a player already at 1118+ Exp, or who already has a
--   carryover row, is skipped.
--
-- Check afterwards:
--   SELECT count(*) FROM (SELECT DISTINCT user_id FROM point_events WHERE source = 'maia_game') p
--   LEFT JOIN user_exp e USING (user_id) WHERE coalesce(e.total_exp, 0) < 1118;
--     → 0

DO $$
DECLARE
  unlock_exp CONSTANT integer := 1118;
  payer RECORD;
  granted_users integer := 0;
  granted_exp integer := 0;
BEGIN
  FOR payer IN
    SELECT p.user_id, p.first_charge_at, coalesce(e.total_exp, 0) AS total_exp
    FROM (
      SELECT user_id, min(created_at) AS first_charge_at
      FROM point_events
      WHERE source = 'maia_game'
      GROUP BY user_id
    ) p
    LEFT JOIN user_exp e ON e.user_id = p.user_id
    WHERE coalesce(e.total_exp, 0) < unlock_exp
      AND NOT EXISTS (
        SELECT 1 FROM exp_events x
        WHERE x.user_id = p.user_id AND x.source = 'maia_access_carryover'
      )
    ORDER BY p.user_id
  LOOP
    INSERT INTO exp_events (user_id, source, amount, metadata, created_at)
    VALUES (
      payer.user_id,
      'maia_access_carryover',
      unlock_exp - payer.total_exp,
      jsonb_build_object('reason', 'coin_retirement', 'totalExpBefore', payer.total_exp),
      payer.first_charge_at
    );

    INSERT INTO user_exp (user_id, total_exp, updated_at)
    VALUES (payer.user_id, unlock_exp, now())
    ON CONFLICT (user_id) DO UPDATE SET total_exp = unlock_exp, updated_at = now();

    granted_users := granted_users + 1;
    granted_exp := granted_exp + (unlock_exp - payer.total_exp);
  END LOOP;

  RAISE NOTICE 'Granted % Exp across % player(s) to reach the Maia unlock level', granted_exp, granted_users;
END $$;
