'use client';
import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function EmptyGameList({ locale }: Props) {
  const t = useTranslations('home.gameList');

  return (
    <div className="bg-card rounded-md border border-border overflow-hidden">
      <div className="p-8 sm:p-12">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <span className="text-2xl">♔</span>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{t('noGames')}</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t.rich('startGuidance', {
              link: (chunks) => (
                <Link href={`/${locale}/games/new`} className={`font-medium ${TEXT_LINK_CLASSES}`}>
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
