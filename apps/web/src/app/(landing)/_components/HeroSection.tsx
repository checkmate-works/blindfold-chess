import type { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/app/_components';
import { SITE_NAME } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

import { LanguageSelector } from './LanguageSelector';
import { ScrollIndicator } from './ScrollIndicator';

type Props = {
  locale: Locale;
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
};

export function HeroSection({ locale, t }: Props) {
  return (
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
  );
}
