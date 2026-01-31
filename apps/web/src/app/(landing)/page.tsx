import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/app/_components';
import { SITE_DOMAIN, SITE_NAME } from '@/config';
import { FaBrain, FaChessKnight, FaGraduationCap, FaRobot } from 'react-icons/fa';

import { getLocaleFromRequest } from '@/lib/locale';

import { LanguageSelector, ScrollIndicator, TrainingCard } from './_components';

export default async function RootPage() {
  const locale = await getLocaleFromRequest();
  const t = await getTranslations({ locale, namespace: 'landing' });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-secondary via-background to-secondary">
        <div className="text-center w-full max-w-4xl mx-auto space-y-12">
          {/* Logo & Title */}
          <div className="space-y-6">
            <div className="flex justify-center">
              <Image
                src="/logo.png"
                alt={`${SITE_NAME} Logo`}
                width={120}
                height={120}
                className="w-32 h-32 md:w-40 md:h-40 drop-shadow-2xl"
              />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">
              {SITE_NAME}
            </h1>
          </div>

          {/* Call to Action */}
          <div className="flex flex-col items-center gap-6">
            <Link href={`/${locale}/getting-started`}>
              <Button
                variant="primary"
                size="lg"
                asChild
                className="shadow-lg hover:shadow-xl hover:scale-105"
              >
                <span className="flex items-center gap-2">🚀 {t('getStarted')}</span>
              </Button>
            </Link>

            {/* Language Selector */}
            <div className="flex flex-col items-center gap-4">
              <LanguageSelector currentLocale={locale} />
              <Link
                href={`/${locale}`}
                className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
              >
                {t('goToTop')}
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <ScrollIndicator />
      </section>

      {/* Feature 1: AI Battle */}
      <section className="py-24 px-6 bg-card border-y border-border/50">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl">
            <FaRobot />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">{t('aiBattle.title')}</h2>
          </div>
          <p className="text-lg leading-relaxed text-muted-foreground max-w-2xl">
            {t('aiBattle.description')}
          </p>
          <div className="pt-4 flex justify-center">
            <Link
              href={`/${locale}/game/new`}
              className="inline-flex items-center justify-center rounded-md bg-secondary px-8 py-3 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {t('aiBattle.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Feature 2: Training Modes */}
      <section className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">{t('training.title')}</h2>
          </div>
          <div className="flex justify-center mb-8">
            <Link
              href={`/${locale}/practice`}
              className="inline-flex items-center justify-center rounded-md bg-secondary px-8 py-3 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {t('training.viewAll')}
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <TrainingCard
              icon={<FaBrain />}
              iconColor="blue"
              title={t('training.positionMemory.title')}
              description={t('training.positionMemory.description')}
              href={`/${locale}/practice/position-memory`}
              cta={t('training.positionMemory.cta')}
            />
            <TrainingCard
              icon={<FaChessKnight />}
              iconColor="orange"
              title={t('training.knightTour.title')}
              description={t('training.knightTour.description')}
              href={`/${locale}/practice/knight-tour`}
              cta={t('training.knightTour.cta')}
            />
          </div>
        </div>
      </section>

      {/* Feature 3: Learn */}
      <section className="py-24 px-6 bg-gradient-to-b from-secondary/30 to-background border-t border-border/50">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center text-green-600 text-3xl">
            <FaGraduationCap />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">{t('learn.title')}</h2>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('learn.description')}
            <Link
              href={`/${locale}/learn/memory/de-groot-experiment`}
              className="text-muted-foreground underline hover:text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm transition-colors"
            >
              {t('learn.deGrootLink')}
            </Link>
            {t('learn.descriptionSuffix')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8">
            <Link
              href={`/${locale}/learn`}
              className="inline-flex items-center justify-center rounded-md bg-secondary px-8 py-3 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {t('learn.cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-secondary/30 border-t border-border space-y-8 text-center">
        {/* Getting Started CTA */}
        <div className="flex justify-center">
          <Link href={`/${locale}/getting-started`}>
            <Button
              variant="primary"
              size="lg"
              asChild
              className="rounded-lg shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
            >
              <span className="flex items-center gap-2">🚀 {t('getStarted')}</span>
            </Button>
          </Link>
        </div>

        {/* Language Selector */}
        <div className="flex justify-center">
          <LanguageSelector currentLocale={locale} />
        </div>

        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {SITE_DOMAIN}
        </div>
      </footer>
    </div>
  );
}
