'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaBrain } from 'react-icons/fa';

import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';

import { ShareEnableModal } from './ShareEnableModal';

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
 * - Signed-in click → the share prompt modal (this game must be published before
 *   it can be discussed), surfaced via {@link JoinConversationToggle.onActivate}.
 *
 * Both branches are modals with the same shell, so the "do X first" gate reads
 * consistently: sign in when signed out, share when signed in.
 */
export function LocalDiscussionPanel({ onShare, isShared }: Props) {
  const t = useTranslations('sharedGames');
  const [shareModalOpen, setShareModalOpen] = useState(false);

  return (
    <div className="space-y-3">
      <JoinConversationToggle
        count={0}
        joinLabel={t('comments.joinConversation')}
        onActivate={() => setShareModalOpen(true)}
      />
      <JoinConversationToggle
        count={0}
        joinLabel={t('chunks.suggest')}
        icon={<FaBrain aria-hidden="true" className="text-muted-foreground" />}
        onActivate={() => setShareModalOpen(true)}
      />

      <ShareEnableModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onShare={onShare}
        isShared={isShared}
      />
    </div>
  );
}
