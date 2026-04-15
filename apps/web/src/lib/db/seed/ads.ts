import { adBanners, db, siteSettings } from '../index';

// ---------------------------------------------------------------------------
// Initial data: Ads & site settings (DB is source of truth, insert once only)
// ---------------------------------------------------------------------------

export async function seedAds() {
  console.log('Seeding ads configuration...');

  // Site setting: ads_enabled
  await db
    .insert(siteSettings)
    .values({ key: 'ads_enabled', value: { enabled: false } })
    .onConflictDoNothing({ target: siteSettings.key });

  // Ad banners
  const bannerData = [
    {
      slot: 'banner-wide',
      href: 'https://example.com',
      imagePath: '/images/banners/banner1.webp',
      alt: 'Advertisement',
      width: 960,
      height: 208,
    },
    {
      slot: 'banner-standard',
      href: 'https://example.com',
      imagePath: '/images/banners/banner2.webp',
      alt: 'Advertisement',
      width: 400,
      height: 400,
    },
    {
      slot: 'native-ad',
      href: 'https://example.com',
      imagePath: '/images/banners/native-ad.webp',
      alt: 'Advertisement',
      width: 400,
      height: 300,
    },
  ] as const;

  for (const banner of bannerData) {
    await db.insert(adBanners).values(banner).onConflictDoNothing({ target: adBanners.slot });
  }
}
