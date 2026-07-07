import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import { eq } from 'drizzle-orm';

import { isAdSlot } from '@/lib/ads/registry';
import { adCreatives, db } from '@/lib/db';

import { AdminPageHeader } from '../../../_components/AdminPageHeader';
import { AdCreativeForm } from '../../_components/AdCreativeForm';
import type { AdCreativeFormInitial } from '../../_components/AdCreativeForm';
import { buildAdCreativeFormLabels } from '../../_lib/form-labels';

/** DB timestamp → `datetime-local` input value (empty when null). */
function toDatetimeLocal(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 16);
}

type Props = { params: Promise<{ id: string }> };

export default async function EditAdCreativePage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });

  const [row] = await db.select().from(adCreatives).where(eq(adCreatives.id, id)).limit(1);
  if (!row || !isAdSlot(row.slot)) {
    notFound();
  }

  const initial: AdCreativeFormInitial = {
    slot: row.slot,
    href: row.href,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    startAt: toDatetimeLocal(row.startAt),
    endAt: toDatetimeLocal(row.endAt),
    targetCountries: row.targetCountries,
    // Payload shape is validated on write; the form reads fields defensively.
    payload: row.payload as AdCreativeFormInitial['payload'],
  };

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: t('title'), href: '/admin/ads' }, { label: t('editTitle') }]}
      />
      <AdCreativeForm
        mode="edit"
        creativeId={id}
        locales={SUPPORTED_LOCALES}
        labels={buildAdCreativeFormLabels(t)}
        initial={initial}
      />
    </div>
  );
}
