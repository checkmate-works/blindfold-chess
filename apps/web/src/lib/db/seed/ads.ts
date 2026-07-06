import type { BannerPayload, NativeCardPayload } from '@/lib/ads/payload';

import { adCreatives, db } from '../index';

// ---------------------------------------------------------------------------
// Initial data: ad creatives (DB is source of truth, insert once only)
// ---------------------------------------------------------------------------

type SeedCreative = {
  kind: string;
  slot: string;
  href: string;
  sortOrder: number;
  payload: BannerPayload | NativeCardPayload;
};

const seedCreatives: SeedCreative[] = [
  {
    kind: 'banner',
    slot: 'banner-wide',
    href: 'https://example.com',
    sortOrder: 0,
    payload: {
      imagePath: '/images/banners/banner1.webp',
      alt: 'Advertisement',
      width: 960,
      height: 208,
    },
  },
  {
    kind: 'banner',
    slot: 'banner-standard',
    href: 'https://example.com',
    sortOrder: 0,
    payload: {
      imagePath: '/images/banners/banner2.webp',
      alt: 'Advertisement',
      width: 400,
      height: 400,
    },
  },
  {
    kind: 'native_card',
    slot: 'feed-native-ad',
    href: 'https://example.com',
    sortOrder: 0,
    payload: {
      avatarImagePath: null,
      avatarAlt: 'Advertisement',
      title: {
        en: 'Master the Ruy Lopez',
        ja: 'ルイ・ロペスを極める',
        es: 'Domina la Ruy López',
        'pt-BR': 'Domine o Ruy Lopez',
      },
      description: {
        en: "A closer look at one of chess's oldest and most respected openings.",
        ja: 'チェス最古かつ最も評価の高いオープニングの一つを深掘りする一冊。',
        es: 'Un vistazo más de cerca a una de las aperturas más antiguas y respetadas del ajedrez.',
        'pt-BR':
          'Uma análise mais profunda de uma das aberturas mais antigas e respeitadas do xadrez.',
      },
    },
  },
];

export async function seedAds() {
  console.log('Seeding ad creatives...');

  // slot is intentionally non-unique (creatives rotate within a placement),
  // so there is no natural conflict target — seed only when empty.
  const existing = await db.select({ id: adCreatives.id }).from(adCreatives).limit(1);
  if (existing.length > 0) return;

  await db.insert(adCreatives).values(seedCreatives);
}
