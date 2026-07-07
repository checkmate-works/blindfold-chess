import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAllAdCreatives } from '@/lib/ads/ad';
import { isBannerPayload, isNativeCardPayload } from '@/lib/ads/payload';
import { isAdSlot, kindForSlot } from '@/lib/ads/registry';

import { AdminBadge } from '../../_components/AdminBadge';
import { AdminPageHeader } from '../../_components/AdminPageHeader';
import { CreativeDeleteButton } from '../_components/CreativeDeleteButton';

type Props = { params: Promise<{ slot: string }> };

export default async function AdminSlotCreativesPage({ params }: Props) {
  const { slot } = await params;
  if (!isAdSlot(slot)) notFound();

  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });
  const creatives = (await getAllAdCreatives()).filter((c) => c.slot === slot);

  const deleteLabels = {
    delete: t('delete'),
    deleting: t('deleting'),
    confirm: t('deleteConfirm'),
  };

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[{ label: t('title'), href: '/admin/ads' }, { label: slot }]}
        actions={
          <Link
            href={`/admin/ads/${slot}/new`}
            className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {t('newCreative')}
          </Link>
        }
      />

      <div className="mb-4 text-sm text-muted-foreground">
        {t('kind')}: <AdminBadge variant="neutral">{kindForSlot(slot)}</AdminBadge>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-accent">
            <tr>
              <th className="text-left px-4 py-3 font-medium">{t('summary')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('sortOrder')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('targetCountry')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('isActive')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {creatives.map((creative) => (
              <tr key={creative.id} className="border-t border-border">
                <td className="px-4 py-3">
                  {isBannerPayload(creative.payload) ? (
                    <Image
                      src={creative.payload.imagePath}
                      alt={creative.payload.alt}
                      width={64}
                      height={64}
                      className="rounded object-cover"
                    />
                  ) : isNativeCardPayload(creative.payload) ? (
                    <span className="max-w-[240px] truncate inline-block">
                      {creative.payload.title.en ?? '—'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{creative.sortOrder}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {creative.targetCountry ?? '🌐'}
                </td>
                <td className="px-4 py-3">
                  <AdminBadge variant={creative.isActive ? 'success' : 'danger'}>
                    {creative.isActive ? t('active') : t('inactive')}
                  </AdminBadge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/ads/${slot}/${creative.id}/edit`}
                      className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
                    >
                      {t('edit')}
                    </Link>
                    <CreativeDeleteButton id={creative.id} labels={deleteLabels} />
                  </div>
                </td>
              </tr>
            ))}
            {creatives.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t('noBanners')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
