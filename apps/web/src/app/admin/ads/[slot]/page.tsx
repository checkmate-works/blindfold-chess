import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAdCreativeCopy, getAllAdCreatives } from '@/lib/ads/ad';
import { isPlaceholderAdHref } from '@/lib/ads/placeholder';
import { isAdSlot, kindForSlot } from '@/lib/ads/registry';

import { AdminBadge } from '../../_components/AdminBadge';
import { AdminPageLayout } from '../../_components/AdminPageLayout';
import { SlotCreativeList } from '../_components/SlotCreativeList';
import type { SlotCreativeRow } from '../_components/SlotCreativeList';

type Props = { params: Promise<{ slot: string }> };

export default async function AdminSlotCreativesPage({ params }: Props) {
  const { slot } = await params;
  if (!isAdSlot(slot)) notFound();

  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });
  // Already ordered by (slot, sort_order) — the row order is the display order.
  const creatives = (await getAllAdCreatives()).filter((c) => c.slot === slot);
  const copyById = await getAdCreativeCopy(creatives.map((c) => c.id));

  // The admin surface has no locale of its own; `en` is the copy every
  // creative is required to carry.
  const rows: SlotCreativeRow[] = creatives.map((c) => ({
    id: c.id,
    isActive: c.isActive,
    hasPlaceholderHref: isPlaceholderAdHref(c.href),
    summary: copyById.get(c.id)?.title.en ?? '',
    imageUrl: c.thumbnailImagePath,
    boardFen: c.thumbnailFen,
  }));

  return (
    <AdminPageLayout
      breadcrumbs={[{ label: t('title'), href: '/admin/ads' }, { label: slot }]}
      actions={
        <Link
          href={`/admin/ads/${slot}/new`}
          className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {t('newCreative')}
        </Link>
      }
    >
      <div className="mb-4 text-sm text-muted-foreground">
        {t('kind')}: <AdminBadge variant="neutral">{kindForSlot(slot)}</AdminBadge>
      </div>

      <SlotCreativeList
        slot={slot}
        rows={rows}
        editHrefBase={`/admin/ads/${slot}`}
        labels={{
          active: t('active'),
          inactive: t('inactive'),
          edit: t('edit'),
          copyId: t('copyId'),
          copiedId: t('copiedId'),
          hrefNotSet: t('hrefNotSet'),
          hrefNotSetHint: t('hrefNotSetHint'),
          reorderHint: t('reorderHint'),
          empty: t('noCreatives'),
        }}
      />
    </AdminPageLayout>
  );
}
