'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MiniBoard } from '@/lib/positions/ui/MiniBoard';

import { BoardReviewModal } from './BoardReviewModal';

/**
 * Subset of `post_fen_attachments` columns the card needs.
 *
 * @design Component contract
 *
 * `AttachedFenCard` MUST only ever be rendered for attachments whose
 * parent `topic_post` is non-soft-deleted. The visibility rule is
 * enforced by (a) the RLS SELECT policy on `post_fen_attachments`,
 * (b) the application-layer query that filters
 * `topic_posts.deleted_at IS NULL`, and (c) this contract — three
 * layers of defense, mirroring the other attached-card renderers.
 *
 * @design FEN is rendered statically
 *
 * The mini-board is a static thumbnail of the FEN placement only; the
 * card does NOT replay or expose any chess-engine evaluation. The FEN
 * was validated at write time via the chess-core two-stage validator
 * (`validateFenSemantic`) and the DB CHECK regex, so the placement
 * passed to `<MiniBoard>` is well-formed.
 */
export type AttachedFenCardData = {
  id: string;
  fen: string;
  caption: string | null;
};

type Props = {
  attachment: AttachedFenCardData;
};

export function AttachedFenCard({ attachment }: Props) {
  const t = useTranslations('attachment');
  const [modalOpen, setModalOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="mt-2 mb-2 rounded-md border border-border bg-card overflow-hidden">
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium text-foreground">{t('card.positionLabel')}</p>
        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-3 gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-32 shrink-0 mx-auto sm:mx-0 cursor-pointer block focus:outline-none focus-visible:ring-2 focus-visible:ring-link-primary rounded-sm"
            aria-label={t('card.enlargePosition')}
          >
            <MiniBoard fen={attachment.fen} responsive />
          </button>
          <div className="flex-1 min-w-0 space-y-1">
            {attachment.caption && (
              <p className="text-sm text-foreground break-words">{attachment.caption}</p>
            )}
            <p className="text-xs text-muted-foreground font-mono break-all">{attachment.fen}</p>
          </div>
        </div>
      </div>
      <BoardReviewModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('card.positionLabel')}
        fen={attachment.fen}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
      />
    </div>
  );
}
