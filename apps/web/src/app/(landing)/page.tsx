/**
 * Root Dashboard / Landing
 *
 * @description
 * The root URL (`/`) page. Serves two different views based on authentication state:
 * - **Logged-in users**: Dashboard with shortcut sections (VS AI, Challenge, Topics)
 *   rendered via `DashboardPlaceholder`.
 * - **Guests**: Marketing landing page with hero, AI battle, ranks, and training sections.
 *
 * @flow
 * - Auth check → logged-in: DashboardPlaceholder (shortcut cards for games, challenges, topics)
 * - Auth check → guest: Landing page (HeroSection, AiBattleSection, RanksSection, TrainingSection)
 *
 * SEO: `?lang=xx` (whitelisted to `SUPPORTED_LOCALES`) takes priority over
 * cookie and Accept-Language so Googlebot can index the non-English LP
 * content via `/?lang=ja`, `/?lang=es`, `/?lang=pt-BR`. These four URLs
 * (including bare `/` for en) form the LP hreflang cluster; canonical is
 * self-referential per variant.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OG_LOCALE_MAP } from '@/i18n/og-locale';
import { eq } from 'drizzle-orm';

import { getOptionalUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';
import { buildLandingLanguageAlternates, buildLandingUrl } from '@/lib/seo/landing-urls';

import {
  AiBattleSection,
  DashboardPlaceholder,
  HeroSection,
  RanksSection,
  TrainingSection,
} from './_components';
import { DashboardFooter } from './_components/DashboardFooter';
import { Footer } from './_components/Footer';
import { getLandingLocale } from './_lib/getLandingLocale';

export const dynamic = 'force-dynamic';

type SearchParamsInput = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParamsInput;
}): Promise<Metadata> {
  const locale = await getLandingLocale(await searchParams);
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const landingTitle = t('landingTitle');
  const landingDescription = t('landingDescription');
  const siteName = t('siteName');
  const currentLocale = OG_LOCALE_MAP[locale];
  const alternateLocales = Object.values(OG_LOCALE_MAP).filter((l) => l !== currentLocale);
  const canonical = buildLandingUrl(locale);

  return {
    title: landingTitle,
    description: landingDescription,
    alternates: {
      canonical,
      languages: buildLandingLanguageAlternates(),
    },
    openGraph: {
      title: landingTitle,
      description: landingDescription,
      url: canonical,
      siteName,
      type: 'website',
      locale: currentLocale,
      alternateLocale: alternateLocales,
      images: [
        {
          url: '/logo.png',
          width: 512,
          height: 512,
          alt: `${siteName} Logo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: landingTitle,
      description: landingDescription,
      images: ['/logo.png'],
    },
  };
}

export default async function RootPage({ searchParams }: { searchParams: SearchParamsInput }) {
  const locale = await getLandingLocale(await searchParams);
  const [t, metaT, tRanks, user] = await Promise.all([
    getTranslations({ locale, namespace: 'landing' }),
    getTranslations({ locale, namespace: 'metadata' }),
    getTranslations({ locale, namespace: 'ranks' }),
    getOptionalUser(),
  ]);

  if (user) {
    let displayName: string | null = null;
    let avatarUrl: string | null = null;

    const [profile] = await db
      .select({ displayName: profiles.displayName, avatarUrl: profiles.avatarUrl })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (profile) {
      displayName = profile.displayName;
      avatarUrl = profile.avatarUrl;
    }

    return (
      <>
        <DashboardPlaceholder
          t={t}
          locale={locale}
          siteName={metaT('siteName')}
          displayName={displayName}
          avatarUrl={avatarUrl}
        />
        <DashboardFooter locale={locale} />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <HeroSection locale={locale} t={t} siteName={metaT('siteName')} />
      <AiBattleSection locale={locale} t={t} />
      <RanksSection locale={locale} t={t} tRanks={tRanks} />
      <TrainingSection locale={locale} t={t} />
      <Footer locale={locale} t={t} />
    </main>
  );
}
