'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { MAX_GAMES } from '@/config';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaExclamationTriangle } from 'react-icons/fa';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function GameLimitError({ locale }: Props) {
  const t = useTranslations('newGame');
  const router = useRouter();

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

      <div className="flex justify-center pt-4">
        <Button
          onClick={() => router.push(`/${locale}`)}
          variant="primary"
          size="lg"
          className="rounded-lg font-medium"
        >
          {t('backToGameList')}
        </Button>
      </div>
    </div>
  );
}
