'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FaPlus } from 'react-icons/fa';
import type { Locale } from '../../_lib/types';

type Props = {
  locale: Locale;
};

export function NewGameCard({ locale }: Props) {
  const t = useTranslations('home');

  return (
    <Link
      href={`/${locale}/game/new`}
      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-card hover:bg-muted/30 text-foreground font-medium rounded-xl border border-border hover:border-muted-foreground transition-colors touch-manipulation"
    >
      <FaPlus className="w-5 h-5" />
      <span>{t('newGame')}</span>
    </Link>
  );
}
