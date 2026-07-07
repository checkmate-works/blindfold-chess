import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AdminPageHeader } from '@/app/admin/_components/AdminPageHeader';
import { BannerCreativeForm } from '@/app/admin/ads/_components/BannerCreativeForm';
import { NativeCardCreativeForm } from '@/app/admin/ads/_components/NativeCardCreativeForm';
import { buildAdCreativeFormLabels } from '@/app/admin/ads/_lib/form-labels';
import type { CommonCreativeInitial } from '@/app/admin/ads/_lib/use-common-creative-state';
import { SUPPORTED_LOCALES } from '@/config';

import { isAdSlot, kindForSlot } from '@/lib/ads/registry';

type Props = { params: Promise<{ slot: string }> };

const EMPTY_COMMON: CommonCreativeInitial = {
  href: '',
  isActive: true,
  sortOrder: 0,
  startAt: '',
  endAt: '',
  targetCountry: null,
};

export default async function NewCreativePage({ params }: Props) {
  const { slot } = await params;
  if (!isAdSlot(slot)) notFound();

  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });
  const labels = buildAdCreativeFormLabels(t);

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: t('title'), href: '/admin/ads' },
          { label: slot, href: `/admin/ads/${slot}` },
          { label: t('createTitle') },
        ]}
      />
      {kindForSlot(slot) === 'banner' ? (
        <BannerCreativeForm
          mode="create"
          slot={slot}
          labels={labels}
          initial={{ ...EMPTY_COMMON, payload: {} }}
        />
      ) : (
        <NativeCardCreativeForm
          mode="create"
          slot={slot}
          locales={SUPPORTED_LOCALES}
          labels={labels}
          initial={{ ...EMPTY_COMMON, payload: {} }}
        />
      )}
    </div>
  );
}
