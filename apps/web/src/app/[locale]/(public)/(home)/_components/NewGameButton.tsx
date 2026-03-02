import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

import { Button } from '@/app/_components';
import { FaPlus } from 'react-icons/fa';

import type { Locale } from '@/app/[locale]/_lib/types';

export async function NewGameButton({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'home' });

  return (
    <Link href={`/${locale}/games/new`} className="w-full">
      <Button
        variant="primary"
        size="lg"
        icon={<FaPlus className="w-5 h-5" />}
        className="w-full py-4 rounded-md font-medium touch-manipulation"
      >
        {t('newGame')}
      </Button>
    </Link>
  );
}
