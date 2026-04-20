'use client';

import { useCallback, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { Divider } from '@/app/[locale]/_components/Divider';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ClientBreadcrumb } from './ClientBreadcrumb';
import { PlayClient } from './PlayClient';

type Props = {
  locale: Locale;
};

export function PlayPageClient({ locale }: Props) {
  const t = useTranslations('play');
  const tCommon = useTranslations('common');
  const tGames = useTranslations('gamesPage');
  const [aiMoveDisplay, setAiMoveDisplay] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [lastAttemptedInput, setLastAttemptedInput] = useState('');

  const handleMoveErrorChange = useCallback((error: string | null, attemptedInput: string) => {
    setMoveError(error);
    setLastAttemptedInput(attemptedInput);
  }, []);

  // Resolve the content of the single status slot (PageTitle).
  // Priority: active move error → AI's last move announcement → initial "Play Chess" title.
  // Kept single-line via `truncate` so the swap between error and normal state does not
  // reflow and cause CLS on narrow viewports.
  const titleContent = moveError ? (
    <span className="text-destructive truncate block">
      {lastAttemptedInput
        ? `\u26A0 ${t('invalidMove')}: ${lastAttemptedInput}`
        : `\u26A0 ${moveError}`}
    </span>
  ) : (
    aiMoveDisplay || t('title')
  );

  return (
    <div className="space-y-8">
      <PageTitle>{titleContent}</PageTitle>
      <PagePanel>
        <PlayClient
          locale={locale}
          onAiMoveChange={setAiMoveDisplay}
          onMoveErrorChange={handleMoveErrorChange}
        />
        <Divider />
        <ClientBreadcrumb
          items={[{ label: tGames('pageTitle'), href: '/games' }, { label: t('title') }]}
          locale={locale}
          brandName={tCommon('brandName')}
        />
      </PagePanel>
    </div>
  );
}
