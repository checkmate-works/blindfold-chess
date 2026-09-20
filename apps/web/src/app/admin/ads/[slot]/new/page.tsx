import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AdminPageLayout } from '@/app/admin/_components/AdminPageLayout';
import { CreativeFormForKind } from '@/app/admin/ads/_components/CreativeFormForKind';
import { buildAdCreativeFormLabels } from '@/app/admin/ads/_lib/form-labels';
import type { CreativeFormInitial } from '@/app/admin/ads/_lib/use-common-creative-state';

import { isAdSlot, kindForSlot } from '@/lib/ads/registry';

type Props = { params: Promise<{ slot: string }> };

const EMPTY_INITIAL: CreativeFormInitial = {
  href: '',
  isActive: true,
};

export default async function NewCreativePage({ params }: Props) {
  const { slot } = await params;
  if (!isAdSlot(slot)) notFound();

  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });
  const labels = buildAdCreativeFormLabels(t);
  const kind = kindForSlot(slot);

  return (
    <AdminPageLayout
      breadcrumbs={[
        { label: t('title'), href: '/admin/ads' },
        { label: slot, href: `/admin/ads/${slot}` },
        { label: t('createTitle') },
      ]}
    >
      <CreativeFormForKind
        kind={kind}
        mode="create"
        slot={slot}
        labels={labels}
        initial={EMPTY_INITIAL}
      />
    </AdminPageLayout>
  );
}
