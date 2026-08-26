import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAllAdCreatives } from '@/lib/ads/ad';
import { isBannerPayload, isNativeCardPayload, resolveNativeThumbnail } from '@/lib/ads/payload';
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

  const rows: SlotCreativeRow[] = creatives.map((c) => {
    const base = { id: c.id, isActive: c.isActive, targetCountry: c.targetCountry };
    if (isBannerPayload(c.payload)) {
      return { ...base, summary: c.payload.alt, imageUrl: c.payload.imagePath, boardFen: null };
    }
    if (isNativeCardPayload(c.payload)) {
      const thumb = resolveNativeThumbnail(c.payload);
      return {
        ...base,
        summary: c.payload.title,
        imageUrl: thumb.imagePath ?? null,
        boardFen: thumb.fen,
      };
    }
    return { ...base, summary: '', imageUrl: null, boardFen: null };
  });

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
          delete: t('delete'),
          deleting: t('deleting'),
          confirm: t('deleteConfirm'),
          reorderHint: t('reorderHint'),
          empty: t('noBanners'),
          filterAll: t('filterAll'),
          filterReorderHint: t('filterReorderHint'),
        }}
      />
    </AdminPageLayout>
  );
}
