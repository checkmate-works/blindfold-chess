import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { FaPlus } from 'react-icons/fa';

import type { Locale } from '@/app/[locale]/_lib/types';

export async function NewGameButton({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home' });

  return (
    <Link
      href={`/${locale}/game/new`}
      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-card text-foreground font-medium rounded-xl border border-border hover:bg-background dark:hover:bg-muted transition-all duration-200 touch-manipulation"
    >
      <FaPlus className="w-5 h-5" />
      <span>{t('newGame')}</span>
    </Link>
  );
}
