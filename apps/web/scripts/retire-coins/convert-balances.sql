-- Convert every leftover coin balance into ad-free days (1 coin = 1 day).
--
-- Purpose:
--   The coin economy was retired in 2026-11. Coins could always be redeemed
--   for ad-free time at 1 coin = 1 day, so each user's remaining balance is
--   redeemed for them at that same rate, rather than left to disappear with
--   the ledger. At the time of writing that is 143 users holding 509 coins
--   (median 2, largest 52).
--
-- What it writes, per user with a balance — the same rows the retired
-- `redeemPointsForAdFree` wrote, so `/mypage/benefits` and the admin ledger
-- views read a converted balance exactly like a redemption the user made:
--   - `point_redemptions`: one `completed` row, `cost` = the whole balance.
--   - `point_events`: one negative row per category drawn from
--     (`source = 'redemption'`, `source_id` = the redemption id).
--   - `user_point_balances`: every category set to 0.
--   - `user_grants`: one `ad_free` grant of <balance> days, stacked after the
--     user's latest active ad-free grant so it extends rather than overlaps.
--
-- Prerequisites:
--   - The release that stops minting and spending coins is deployed, so
--     balances are frozen. Run this AFTER it, not before: a like-coin batch
--     running afterwards would leave fresh balances behind.
--
-- How to run:
--   Execute in the Supabase SQL Editor. It is one transaction (a DO block):
--   it converts everyone or, on any error, no one.
--   Idempotent — a user whose balance is already 0 is skipped, so a second
--   run changes nothing and reports 0 users.
--
-- Not done here:
--   - No notification is sent. Tell users with an announcement.
--   - `hasAdFreeEntitlement` is cached per user for a short time, so a grant
--     can take a minute to show up as hidden ads.
--   - A subscriber or dan-rank holder already browses ad-free; their grant is
--     issued all the same and simply runs concurrently.
--
-- Check afterwards:
--   SELECT count(*), coalesce(sum(balance), 0) FROM user_point_balances WHERE balance <> 0;
--     → 0, 0
--   SELECT count(*), sum(cost) FROM point_redemptions
--   WHERE metadata->>'reason' = 'coin_retirement';
--     → the user and coin totals the NOTICE reported

DO $$
DECLARE
  holder RECORD;
  bucket RECORD;
  redemption_id uuid;
  first_event_id uuid;
  event_id uuid;
  grant_id uuid;
  grant_starts_at timestamptz;
  run_at timestamptz := now();
  converted_users integer := 0;
  converted_coins integer := 0;
BEGIN
  FOR holder IN
    SELECT user_id, sum(balance)::int AS total
    FROM user_point_balances
    GROUP BY user_id
    HAVING sum(balance) > 0
    ORDER BY user_id
  LOOP
    INSERT INTO point_redemptions (user_id, product_code, cost, status, metadata, completed_at)
    VALUES (
      holder.user_id,
      'ad_free_per_point',
      holder.total,
      'completed',
      jsonb_build_object('durationDays', holder.total, 'reason', 'coin_retirement'),
      run_at
    )
    RETURNING id INTO redemption_id;

    first_event_id := NULL;
    FOR bucket IN
      SELECT category, balance
      FROM user_point_balances
      WHERE user_id = holder.user_id AND balance > 0
      ORDER BY category
      FOR UPDATE
    LOOP
      INSERT INTO point_events (user_id, delta, category, source, source_id, idempotency_key, metadata)
      VALUES (
        holder.user_id,
        -bucket.balance,
        bucket.category,
        'redemption',
        redemption_id::text,
        'redemption:' || redemption_id || ':' || bucket.category,
        jsonb_build_object(
          'productCode', 'ad_free_per_point',
          'durationDays', holder.total,
          'reason', 'coin_retirement'
        )
      )
      RETURNING id INTO event_id;
      first_event_id := coalesce(first_event_id, event_id);
    END LOOP;

    UPDATE user_point_balances
    SET balance = 0, version = version + 1, updated_at = run_at
    WHERE user_id = holder.user_id AND balance <> 0;

    -- Stack after the latest active ad-free grant, as every ad-free grant
    -- does (`stackGrantStart` in src/lib/users/grant-stacking.ts).
    SELECT greatest(coalesce(max(expires_at), run_at), run_at)
    INTO grant_starts_at
    FROM user_grants
    WHERE user_id = holder.user_id
      AND benefit_type = 'ad_free'
      AND revoked_at IS NULL
      AND expires_at > run_at;

    INSERT INTO user_grants (
      user_id, benefit_type, grant_type, source_type, source_id, reason, starts_at, expires_at
    )
    VALUES (
      holder.user_id,
      'ad_free',
      'point_redemption',
      'point_redemption',
      redemption_id::text,
      'Coin retirement: ' || holder.total || ' coin(s) converted to ad-free days',
      grant_starts_at,
      grant_starts_at + make_interval(days => holder.total)
    )
    RETURNING id INTO grant_id;

    UPDATE point_redemptions
    SET point_event_id = first_event_id, user_grant_id = grant_id
    WHERE id = redemption_id;

    converted_users := converted_users + 1;
    converted_coins := converted_coins + holder.total;
  END LOOP;

  RAISE NOTICE 'Converted % coin(s) for % user(s) into ad-free days', converted_coins, converted_users;
END $$;
