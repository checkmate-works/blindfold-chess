'use client';

import type { ReactNode } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';

import { Divider } from '@/app/[locale]/_components/Divider';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useGameSession } from '../_hooks';
import { PlayClient } from './PlayClient';

type Props = {
  locale: Locale;
  breadcrumb: ReactNode;
  /**
   * Server-resolved move-input mode hint from the `bfc_move_input_pref`
   * cookie. Used by `PlayClient` to pick the correct `MoveInputSkeleton`
   * shape during SSR + pre-hydration, eliminating the ~288 px → 50/56 px
   * CLS that returning `text` / `select` users otherwise saw on first paint.
   */
  initialMoveInputHint: MoveInputPreferenceHint;
};

export function PlayPageClient({ locale, breadcrumb, initialMoveInputHint }: Props) {
  const t = useTranslations('play');

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
        <PlayClient
          locale={locale}
          gameSession={gameSession}
          initialMoveInputHint={initialMoveInputHint}
        />
        <Divider />
        {breadcrumb}
      </PagePanel>
    </div>
  );
}
