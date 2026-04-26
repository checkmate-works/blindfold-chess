import type { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { Button } from '@/app/_components';
import { SITE_DOMAIN } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

import { LanguageSelector } from './LanguageSelector';

type Props = {
  locale: Locale;
  t: Awaited<ReturnType<typeof getTranslations<'landing'>>>;
};

export function Footer({ locale, t }: Props) {
  return (
    <footer className="py-12 bg-secondary/30 border-t border-border space-y-8 text-center">
      {/* Getting Started CTA */}
      <div className="flex justify-center">
        <Link href={`/${locale}/getting-started`}>
          <Button
            variant="primary"
            size="lg"
            asChild
            className="rounded-lg hover:scale-105 font-semibold"
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
  );
}
