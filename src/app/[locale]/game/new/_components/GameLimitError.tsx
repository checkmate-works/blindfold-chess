import { useTranslations } from 'next-intl';
import Link from 'next/link';

import { MAX_GAMES } from '@/config';
import { FaExclamationTriangle } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

export function GameLimitError({ locale }: Props) {
  const t = useTranslations('newGame');

  return (
    <div className="space-y-6 text-center py-12">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
          <FaExclamationTriangle className="w-8 h-8 text-destructive" />
        </div>
      </div>

      <div className="space-y-4">
        <SectionTitle className="text-2xl font-bold">{t('gameLimitReached')}</SectionTitle>
        <p className="text-muted-foreground max-w-md mx-auto whitespace-pre-line">
          {t('gameLimitMessage', { limit: MAX_GAMES })}
        </p>
      </div>

      <Link href={`/${locale}`}>
        <button className="px-6 py-3 bg-foreground text-background hover:bg-foreground/90 rounded-lg font-medium transition-colors">
          {t('backToGameList')}
        </button>
      </Link>
    </div>
  );
}
