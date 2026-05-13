/**
 * Admin Points Page
 *
 * @description
 * Minimum-viable admin surface for issuing confirmed point grants.
 * Companion to /admin/grants (which handles ad_free user_grants);
 * this page writes `point_events` rows in `category='promotional'` so
 * the points land in the user's spendable balance immediately, skipping
 * the 7-day maturation window that UGC-derived grants pass through.
 *
 * @flow
 * 1. Admin opens /admin/points.
 * 2. Pastes a user UUID, enters amount, optional reason.
 * 3. createPointGrant server action writes the ledger row, upserts the
 *    materialized balance, and appends a moderation_actions audit row in
 *    one transaction.
 *
 * @design Minimum scope by request
 *
 * No history list, no bulk-grant CSV, no per-user search picker. Those
 * can be layered on later — the audit trail is already in
 * moderation_actions and the user-side history is on /mypage/points.
 */
import { Suspense } from 'react';

import { PointGrantForm } from './_components/PointGrantForm';

export default async function AdminPointsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Points</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Issue confirmed point grants. Grants are immediately spendable; the receiving user&apos;s
          balance, mypage history, and notifications all update on next render.
        </p>
      </div>

      <Suspense>
        <PointGrantForm />
      </Suspense>
    </div>
  );
}
