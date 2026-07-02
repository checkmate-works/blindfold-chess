'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaBrain } from 'react-icons/fa';

import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';

import { ShareEnableCard } from './ShareEnableCard';

type Props = {
  /** Publish this game (or open it if already published from this browser). */
  onShare: () => void;
  /** Whether this game was already published from this browser. */
  isShared: boolean;
};

/**
 * The Discussion tab on the result screen. It mirrors the shared game's per-move
 * compose CTAs ("join the conversation" / "suggest a chunk") so the discussion
 * surface looks identical before and after sharing — but a not-yet-shared game
 * has no server-side record to attach comments/chunks to, so activating a button
 * cannot open a real composer. Instead:
 *
 * - Signed-out click → the sign-up / sign-in modal (via {@link JoinConversationToggle}'s
 *   own auth guard).
 * - Signed-in click → an inline share CTA (this game must be published before it
 *   can be discussed), surfaced via {@link JoinConversationToggle.onActivate}.
 *
 * This is the "state branch" the result screen wants: sign in when signed out,
 * prompt to share when signed in.
 */
export function LocalDiscussionPanel({ onShare, isShared }: Props) {
  const t = useTranslations('sharedGames');
  const [showShareCta, setShowShareCta] = useState(false);

  return (
    <div className="space-y-3">
      <JoinConversationToggle
        count={0}
        joinLabel={t('comments.joinConversation')}
        onActivate={() => setShowShareCta(true)}
      />
      <JoinConversationToggle
        count={0}
        joinLabel={t('chunks.suggest')}
        icon={<FaBrain aria-hidden="true" className="text-muted-foreground" />}
        onActivate={() => setShowShareCta(true)}
      />

      {showShareCta && <ShareEnableCard onShare={onShare} isShared={isShared} />}
    </div>
  );
}
