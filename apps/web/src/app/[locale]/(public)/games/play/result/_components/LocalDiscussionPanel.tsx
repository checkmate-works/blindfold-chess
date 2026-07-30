'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaBrain } from 'react-icons/fa';

import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';

import { PublishPromptModal } from './PublishPromptModal';

type Props = {
  /** Publish this game (or open it if already published from this browser). */
  onShare: () => void;
  /** Whether this game was already published from this browser. */
  isShared: boolean;
  /**
   * Whether to offer the "suggest a chunk" CTA. False on the opening board:
   * chunks are per-move (`game_chunks.ply` is NOT NULL), so the published
   * game's whole-game thread has no chunk composer either — promising one
   * here would be a CTA the shared page can't honour at this position.
   */
  showChunkCta: boolean;
};

/**
 * The Discussion tab on the result screen. It mirrors the shared game's per-move
 * compose CTAs ("join the conversation" / "suggest a chunk") so the discussion
 * surface looks identical before and after sharing — but a not-yet-shared game
 * has no server-side record to attach comments/chunks to, so activating a button
 * cannot open a real composer. Instead:
 *
 * - Anonymous / provisional click → the shared AuthPromptModal (sign in, or
 *   finish registration) via {@link JoinConversationToggle}'s own auth guard —
 *   discussion is members-only.
 * - Registered click → {@link PublishPromptModal} in its `'discussion'` flavour
 *   (this game must be published before it can be discussed), surfaced via
 *   {@link JoinConversationToggle.onActivate}. That flavour argues the thread
 *   alone — the GIF pitch belongs to the share actions in the footer, not to
 *   someone who tapped "join the conversation".
 *
 * Publishing itself is open to everyone via the ungated share actions in the
 * footer below (see LocalGameSocial); this Discussion tab is specifically the
 * members-only *conversation* surface, so its gate is deliberate.
 */
export function LocalDiscussionPanel({ onShare, isShared, showChunkCta }: Props) {
  const t = useTranslations('sharedGames');
  const [shareModalOpen, setShareModalOpen] = useState(false);

  return (
    <div className="space-y-3">
      <JoinConversationToggle
        count={0}
        joinLabel={t('comments.joinConversation')}
        onActivate={() => setShareModalOpen(true)}
      />
      {showChunkCta && (
        <JoinConversationToggle
          count={0}
          joinLabel={t('chunks.suggest')}
          icon={<FaBrain aria-hidden="true" className="text-muted-foreground" />}
          onActivate={() => setShareModalOpen(true)}
        />
      )}

      <PublishPromptModal
        intent="discussion"
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onShare={onShare}
        isShared={isShared}
        // Mirrors the CTA gate above: no chunk CTA here means no chunk promise
        // in the prompt either.
        showChunks={showChunkCta}
      />
    </div>
  );
}
