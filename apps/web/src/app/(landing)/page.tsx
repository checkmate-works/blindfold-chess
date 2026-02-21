import { getTranslations } from 'next-intl/server';

import { getLocaleFromRequest } from '@/lib/locale';

import { AiBattleSection, Footer, HeroSection, LearnSection, TrainingSection } from './_components';

export default async function RootPage() {
  const locale = await getLocaleFromRequest();
  const t = await getTranslations({ locale, namespace: 'landing' });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <HeroSection locale={locale} t={t} />
      <AiBattleSection locale={locale} t={t} />
      <TrainingSection locale={locale} t={t} />
      <LearnSection locale={locale} t={t} />
      <Footer locale={locale} t={t} />
    </div>
  );
}
