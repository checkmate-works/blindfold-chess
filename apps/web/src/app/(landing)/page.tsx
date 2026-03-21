import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { getOptionalUser } from '@/lib/auth';
import { getLocaleFromRequest } from '@/lib/locale';

import { Footer as AppFooter } from '@/app/[locale]/_components/Footer';

import {
  AiBattleSection,
  DashboardPlaceholder,
  HeroSection,
  LearnSection,
  TrainingSection,
} from './_components';
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
    return (
      <>
        <DashboardPlaceholder t={t} locale={locale} siteName={metaT('siteName')} />
        <AppFooter locale={locale} />
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
