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

import { AdminPageLayout } from '../../_components/AdminPageLayout';
import { PointGrantForm } from '../_components/PointGrantForm';

export default async function AdminCoinGrantPage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin' });

  return (
    <AdminPageLayout
      breadcrumbs={[
        { label: t('coins.navLabel'), href: '/admin/coins' },
        { label: t('coins.grant') },
      ]}
    >
      <PointGrantForm />
    </AdminPageLayout>
  );
}
