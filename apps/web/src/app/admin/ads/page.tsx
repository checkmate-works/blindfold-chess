import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { getAdsEnabledDirect, getAllAdBanners } from '@/lib/ads/ad';

import { AdsToggle } from './_components/AdsToggle';
import { BannerEditRow } from './_components/BannerEditRow';

export default async function AdminAdsPage() {
  const t = await getTranslations({ locale: 'en', namespace: 'Admin.adsManagement' });
  const enabled = await getAdsEnabledDirect();
  const banners = await getAllAdBanners();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

      <div className="rounded-lg border border-border bg-secondary p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t('globalToggle')}</h2>
            <p className="text-sm text-muted-foreground">{t('globalToggleDescription')}</p>
          </div>
          <AdsToggle
            enabled={enabled}
            labels={{
              enabled: t('enabled'),
              disabled: t('disabled'),
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('banners')}</h2>
        <Link
          href="/admin/ads/new"
          className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {t('newBanner')}
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-accent">
            <tr>
              <th className="text-left px-4 py-3 font-medium">{t('slot')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('href')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('imagePath')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('imagePreview')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('alt')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('isActive')}</th>
              <th className="text-left px-4 py-3 font-medium">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {banners.map((banner) => (
              <BannerEditRow
                key={banner.id}
                banner={banner}
                labels={{
                  edit: t('edit'),
                  save: t('save'),
                  cancel: t('cancel'),
                  saving: t('saving'),
                  active: t('active'),
                  inactive: t('inactive'),
                }}
              />
            ))}
            {banners.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
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
