import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AdminPageLayout } from '@/app/admin/_components/AdminPageLayout';
import { BannerCreativeForm } from '@/app/admin/ads/_components/BannerCreativeForm';
import { NativeCardCreativeForm } from '@/app/admin/ads/_components/NativeCardCreativeForm';
import { buildAdCreativeFormLabels } from '@/app/admin/ads/_lib/form-labels';
import type { CommonCreativeValues } from '@/app/admin/ads/_lib/use-common-creative-state';
import { eq } from 'drizzle-orm';

import { isPayloadForKind } from '@/lib/ads/payload';
import { isAdSlot, kindForSlot } from '@/lib/ads/registry';
import { adCreatives, db } from '@/lib/db';

type Props = { params: Promise<{ slot: string; id: string }> };

export default async function EditCreativePage({ params }: Props) {
  const { slot, id } = await params;
  if (!isAdSlot(slot)) notFound();

  const [row] = await db.select().from(adCreatives).where(eq(adCreatives.id, id)).limit(1);
  if (!row || row.slot !== slot) notFound();

  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });
  const labels = buildAdCreativeFormLabels(t);

  const common: CommonCreativeValues = {
    href: row.href,
    isActive: row.isActive,
    targetCountry: row.targetCountry,
  };

  return (
    <AdminPageLayout
      breadcrumbs={[
        { label: t('title'), href: '/admin/ads' },
        { label: slot, href: `/admin/ads/${slot}` },
        { label: t('editTitle') },
      ]}
    >
      {/* A stored payload that fails its kind's guard (e.g. written before the
          validation tightened) starts the form empty instead of feeding it
          garbage fields. */}
      {kindForSlot(slot) === 'banner' ? (
        <BannerCreativeForm
          mode="edit"
          slot={slot}
          creativeId={id}
          labels={labels}
          initial={{
            ...common,
            payload: isPayloadForKind('banner', row.payload) ? row.payload : {},
          }}
        />
      ) : (
        <NativeCardCreativeForm
          mode="edit"
          slot={slot}
          creativeId={id}
          labels={labels}
          initial={{
            ...common,
            payload: isPayloadForKind('native_card', row.payload) ? row.payload : {},
          }}
        />
      )}
    </AdminPageLayout>
  );
}
