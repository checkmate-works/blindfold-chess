import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { SITE_NAME } from '@/config';

import { getLocaleFromRequest } from '@/lib/locale';

import { AiBattleSection, Footer, HeroSection, LearnSection, TrainingSection } from './_components';

export const metadata: Metadata = {
  title: SITE_NAME,
};

export default async function RootPage() {
  const locale = await getLocaleFromRequest();
  const t = await getTranslations({ locale, namespace: 'landing' });

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <HeroSection locale={locale} t={t} />
      <AiBattleSection locale={locale} t={t} />
      <TrainingSection locale={locale} t={t} />
      <LearnSection locale={locale} t={t} />
      <Footer locale={locale} t={t} />
    </main>
  );
}
