/**
 * Admin Coin Grant Page (コイン付与, `/admin/coins/grant`)
 *
 * @description
 * Dedicated grant surface, split out of the /admin/coins transactions list so
 * the high-stakes "create coins" action is its own focused page rather than a
 * form crowding the ledger view. Writes a `point_events` row in
 * `category='promotional'` (immediately spendable) plus a moderation_actions
 * audit row, via the createPointGrant Server Action. On success the form sends
 * the admin back to /admin/coins where the new row appears at the top.
 *
 * "Coin" is the facing name for the points ledger — see the
 * "Points / Coin Economy" note in apps/web/CLAUDE.md.
 */
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { FaArrowLeft } from 'react-icons/fa';

import { PointGrantForm } from '../_components/PointGrantForm';

export default async function AdminCoinGrantPage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  return (
    <div>
      <Link
        href="/admin/coins"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <FaArrowLeft className="h-3 w-3" />
        {t('coins.backToTransactions')}
      </Link>

      <h1 className="text-2xl font-bold mb-6">{t('coins.grant')}</h1>

      <div className="max-w-xl">
        <PointGrantForm />
      </div>
    </div>
  );
}
