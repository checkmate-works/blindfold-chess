'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
};

// Simple tutorial position - minimal endgame
const TUTORIAL_FEN = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';

export function FenTutorial({ locale }: Props) {
  const t = useTranslations('practice.fen');
  const router = useRouter();

  const handleStart = () => {
    const params = new URLSearchParams();
    params.set('count', '1');
    params.set('shuffle', '0');
    params.set('mode', 'tutorial');
    params.set('fen', encodeURIComponent(TUTORIAL_FEN));
    router.push(`/${locale}/practice/fen/session?${params.toString()}`);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <p className="text-muted-foreground mb-6 whitespace-pre-line">
          {t('tutorial.description')}
        </p>

        {/* FEN display */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            {t('fenString')}
          </label>
          <div className="px-3 py-2 bg-muted border border-border rounded-md font-mono text-sm break-all">
            {TUTORIAL_FEN}
          </div>
        </div>

        <Button onClick={handleStart} variant="primary" size="lg" className="w-full">
          {t('tutorial.start')}
        </Button>
      </div>
    </div>
  );
}
