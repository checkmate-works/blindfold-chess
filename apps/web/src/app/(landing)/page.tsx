import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { eq } from 'drizzle-orm';

import { getOptionalUser } from '@/lib/auth';
import { db, profiles } from '@/lib/db';
import { getLocaleFromRequest } from '@/lib/locale';

import {
  AiBattleSection,
  DashboardPlaceholder,
  HeroSection,
  LearnSection,
  TrainingSection,
} from './_components';
import { DashboardFooter } from './_components/DashboardFooter';
import { Footer } from './_components/Footer';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocaleFromRequest();
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('seoSiteName'),
  };
}

export default async function RootPage() {
  const locale = await getLocaleFromRequest();
  const [t, metaT, user] = await Promise.all([
    getTranslations({ locale, namespace: 'landing' }),
    getTranslations({ locale, namespace: 'metadata' }),
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
      <TrainingSection locale={locale} t={t} />
      <LearnSection locale={locale} t={t} />
      <Footer locale={locale} t={t} />
    </main>
  );
}
