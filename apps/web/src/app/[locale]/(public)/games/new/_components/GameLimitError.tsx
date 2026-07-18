'use client';

import { Button } from '@/app/_components';
import { MAX_GAMES } from '@/config';
import { Link } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaExclamationTriangle, FaTrash } from 'react-icons/fa';

import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function GameLimitError({ locale }: Props) {
  const t = useTranslations('newGame');
  const tHome = useTranslations('home.gameList');

  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-8">
        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
          <FaExclamationTriangle className="w-8 h-8 text-destructive" />
        </div>

        <p className="text-muted-foreground max-w-md mx-auto whitespace-pre-line">
          {t('gameLimitMessage', { limit: MAX_GAMES })}
        </p>
      </div>

      <div className="pt-4">
        <Link href="/games/bulk-delete" locale={locale} className="block w-full">
          <Button
            variant="primary"
            size="lg"
            icon={<FaTrash className="w-4 h-4" />}
            className="w-full touch-manipulation"
          >
            {tHome('bulkDelete')}
          </Button>
        </Link>

        <Link
          href="/games"
          locale={locale}
          className={`mt-3 inline-block text-sm ${TEXT_LINK_MUTED_CLASSES}`}
        >
          {t('backToGameList')}
        </Link>
      </div>
    </div>
  );
}
