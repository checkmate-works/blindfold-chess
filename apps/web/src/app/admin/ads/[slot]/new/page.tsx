import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AdminPageLayout } from '@/app/admin/_components/AdminPageLayout';
import { NativeCardCreativeForm } from '@/app/admin/ads/_components/NativeCardCreativeForm';
import { buildAdCreativeFormLabels } from '@/app/admin/ads/_lib/form-labels';
import type { CommonCreativeValues } from '@/app/admin/ads/_lib/use-common-creative-state';

import { isAdSlot } from '@/lib/ads/registry';

type Props = { params: Promise<{ slot: string }> };

const EMPTY_COMMON: CommonCreativeValues = {
  href: '',
  isActive: true,
};

export default async function NewCreativePage({ params }: Props) {
  const { slot } = await params;
  if (!isAdSlot(slot)) notFound();

  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });
  const labels = buildAdCreativeFormLabels(t);

  return (
    <AdminPageLayout
      breadcrumbs={[
        { label: t('title'), href: '/admin/ads' },
        { label: slot, href: `/admin/ads/${slot}` },
        { label: t('createTitle') },
      ]}
    >
      <NativeCardCreativeForm
        mode="create"
        slot={slot}
        labels={labels}
        initial={{ ...EMPTY_COMMON, payload: {} }}
      />
    </AdminPageLayout>
  );
}
