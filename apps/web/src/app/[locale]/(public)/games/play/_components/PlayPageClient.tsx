'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { Divider } from '@/app/[locale]/_components/Divider';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useGameSession } from '../_hooks';
import { ClientBreadcrumb } from './ClientBreadcrumb';
import { PlayClient } from './PlayClient';

type Props = {
  locale: Locale;
};

export function PlayPageClient({ locale }: Props) {
  const t = useTranslations('play');
  const tCommon = useTranslations('common');
  const tGames = useTranslations('gamesPage');

  // Own the game session here so the page-level status slot (PageTitle) can
  // read move-error / AI-thinking / AI-move-announcement state directly,
  // without a useEffect bridge from PlayClient.
  const gameSession = useGameSession({ locale });
  const { aiMoveDisplay, isAiThinking } = gameSession;
  const { error: moveError, lastAttemptedInput } = gameSession.moveInput;

  // Resolve the content of the single status slot (PageTitle).
  // Priority: active move error → AI-thinking state → AI's last move
  // announcement → initial "Play Chess" title. Both branches render a
  // `truncate block` span so the swap between states is always single-line
  // and does not reflow / cause CLS on narrow viewports (longer "AI played …"
  // strings would otherwise wrap to 2 lines).
  const titleContent = (
    <span
      className={`truncate block ${
        moveError ? 'text-destructive' : isAiThinking ? 'text-muted-foreground' : ''
      }`}
    >
      {moveError
        ? lastAttemptedInput
          ? `\u26A0 ${t('invalidMove')}: ${lastAttemptedInput}`
          : `\u26A0 ${moveError}`
        : isAiThinking
          ? t('aiThinking')
          : aiMoveDisplay || t('title')}
    </span>
  );

  return (
    <div className="space-y-8">
      <PageTitle>{titleContent}</PageTitle>
      <PagePanel>
        <PlayClient locale={locale} gameSession={gameSession} />
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
