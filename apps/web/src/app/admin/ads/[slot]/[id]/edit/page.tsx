import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AdminPageHeader } from '@/app/admin/_components/AdminPageHeader';
import { BannerCreativeForm } from '@/app/admin/ads/_components/BannerCreativeForm';
import { NativeCardCreativeForm } from '@/app/admin/ads/_components/NativeCardCreativeForm';
import { buildAdCreativeFormLabels } from '@/app/admin/ads/_lib/form-labels';
import type { CommonCreativeInitial } from '@/app/admin/ads/_lib/use-common-creative-state';
import { SUPPORTED_LOCALES } from '@/config';
import { eq } from 'drizzle-orm';

import type { BannerPayload, NativeCardPayload } from '@/lib/ads/payload';
import { isAdSlot, kindForSlot } from '@/lib/ads/registry';
import { adCreatives, db } from '@/lib/db';

type Props = { params: Promise<{ slot: string; id: string }> };

/** DB timestamp → `datetime-local` input value (empty when null). */
function toDatetimeLocal(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 16);
}

export default async function EditCreativePage({ params }: Props) {
  const { slot, id } = await params;
  if (!isAdSlot(slot)) notFound();

  const [row] = await db.select().from(adCreatives).where(eq(adCreatives.id, id)).limit(1);
  if (!row || row.slot !== slot) notFound();

  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });
  const labels = buildAdCreativeFormLabels(t);

  const common: CommonCreativeInitial = {
    href: row.href,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    startAt: toDatetimeLocal(row.startAt),
    endAt: toDatetimeLocal(row.endAt),
    targetCountries: row.targetCountries,
  };

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: t('title'), href: '/admin/ads' },
          { label: slot, href: `/admin/ads/${slot}` },
          { label: t('editTitle') },
        ]}
      />
      {/* Payload shape is validated on write; the forms read fields defensively. */}
      {kindForSlot(slot) === 'banner' ? (
        <BannerCreativeForm
          mode="edit"
          slot={slot}
          creativeId={id}
          labels={labels}
          initial={{ ...common, payload: row.payload as Partial<BannerPayload> }}
        />
      ) : (
        <NativeCardCreativeForm
          mode="edit"
          slot={slot}
          creativeId={id}
          locales={SUPPORTED_LOCALES}
          labels={labels}
          initial={{ ...common, payload: row.payload as Partial<NativeCardPayload> }}
        />
      )}
    </div>
  );
}
