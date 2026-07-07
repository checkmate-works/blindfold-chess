import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { getAllAdCreatives } from '@/lib/ads/ad';
import { AD_SLOT_VALUES, kindForSlot } from '@/lib/ads/registry';

import { AdminBadge } from '../_components/AdminBadge';
import { AdminPageHeader } from '../_components/AdminPageHeader';

export default async function AdminAdsPage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });
  const creatives = await getAllAdCreatives();

  const countsBySlot = new Map<string, { total: number; active: number }>();
  for (const c of creatives) {
    const entry = countsBySlot.get(c.slot) ?? { total: 0, active: 0 };
    entry.total += 1;
    if (c.isActive) entry.active += 1;
    countsBySlot.set(c.slot, entry);
  }

  return (
    <div>
      <AdminPageHeader breadcrumbs={[{ label: t('title') }]} />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-accent">
            <tr>
              <th className="text-left px-4 py-3 font-medium">{t('slot')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('kind')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('creatives')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {AD_SLOT_VALUES.map((slot) => {
              const counts = countsBySlot.get(slot) ?? { total: 0, active: 0 };
              return (
                <tr key={slot} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{slot}</td>
                  <td className="px-4 py-3">
                    <AdminBadge variant="neutral">{kindForSlot(slot)}</AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {counts.active} / {counts.total}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/ads/${slot}`}
                      className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
                    >
                      {t('manage')}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
