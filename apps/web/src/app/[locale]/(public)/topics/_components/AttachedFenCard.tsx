'use client';

import { MiniBoard } from '@/lib/positions/ui/MiniBoard';

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
  return (
    <div className="mt-2 mb-2 rounded-md border border-border bg-card overflow-hidden">
      <div className="p-3 space-y-2">
        {/* TODO(i18n): attachment.fen.cardTitle */}
        <p className="text-sm font-medium text-foreground">Attached position</p>
        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-3 gap-2">
          <div className="w-32 shrink-0 mx-auto sm:mx-0">
            <MiniBoard fen={attachment.fen} responsive />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            {attachment.caption && (
              <p className="text-sm text-foreground break-words">{attachment.caption}</p>
            )}
            <p className="text-xs text-muted-foreground font-mono break-all">{attachment.fen}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
