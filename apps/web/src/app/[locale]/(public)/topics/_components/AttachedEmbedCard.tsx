'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

/**
 * Subset of `post_game_embed_attachments` columns that the card needs.
 *
 * @design Component contract
 *
 * `AttachedEmbedCard` MUST only ever be rendered for attachments whose
 * parent topic_post is non-soft-deleted. The visibility rule is enforced
 * by (a) the RLS SELECT policy on `post_game_embed_attachments`, (b) the
 * application-layer query that filters `topic_posts.deleted_at IS NULL`,
 * and (c) this contract — three layers of defense, mirroring the PGN
 * card's posture (SPEC1 §5-1).
 *
 * @design iframe src reconstruction
 *
 * The iframe `src` is rebuilt server-side from `(embedProvider, embedId)`.
 * The persisted `source_url` column is NEVER read into the rendered
 * `src` attribute — `embedId` is regex-validated at write time AND by
 * the DB CHECK, so reconstructing the URL from it makes the rendered
 * src provably safe regardless of what the row carries (D8 #33).
 *
 * @design iframe sandbox is a string literal
 *
 * The `sandbox` attribute value is a STRING LITERAL per provider, not a
 * dynamically built expression. This is deliberate: the SecurityEngineer
 * Phase 1 baseline (D1) pinned the exact sandbox values, and the Tester
 * suite (#30/#31) verifies them by static-source equality. A future
 * change to these values is therefore a deliberate edit to the literal
 * here, with a corresponding test update.
 *
 * @design Phase 13 narrowing (#83)
 *
 * Lichess /embed/{id} URLs were originally rendered as a Lichess
 * iframe alongside chess.com. Phase 13 retired that path: Lichess
 * embed URLs are now routed through `createChunkPostWithAttachment`
 * and rendered by `AttachedGameCard` + `GameReplayModal`
 * (the self-hosted PGN replay UI). This component is therefore
 * chess.com-only — the DB CHECK on
 * `post_game_embed_attachments.embed_provider` is narrowed to
 * `IN ('chesscom')` as the load-bearing invariant. The `lichess`
 * branch and its postMessage / popup-sandbox rationale are removed.
 */
export type AttachedEmbedCardData = {
  id: string;
  embedProvider: string; // 'chesscom' (Phase 13: Lichess narrowed out)
  embedId: string;
  attributionPlatform: string | null;
  attributionPath: string | null;
};

type Props = {
  attachment: AttachedEmbedCardData;
};

export function AttachedEmbedCard({ attachment }: Props) {
  const t = useTranslations('attachment');

  if (attachment.embedProvider === 'chesscom') {
    return (
      <div className="mt-2 mb-2 rounded-md border border-border bg-card overflow-hidden">
        <div className="p-3 space-y-2">
          <p className="text-sm font-medium text-foreground">{t('embed.chesscomCardTitle')}</p>
          {/* aspect-[60/43]: chess.com emboard renders an 8x8 board PLUS a
              bottom navigation bar (replay controls / fullscreen). The natural
              layout is therefore not square. The aspect ratio matches the
              chess.com Share → Embed default (`width="600" height="430"`,
              i.e. 600:430 = 60:43). Verified during Phase 10 user acceptance
              testing — `aspect-square` left a vertical gap below the embed at
              all breakpoints. */}
          <div className="aspect-[60/43] w-full">
            {/*
              sandbox token rationale (chess.com):
                - allow-scripts: required so the embed can run its own
                  JavaScript (board rendering).
                - allow-same-origin: required so the embed document is
                  treated as living at its real origin (www.chess.com)
                  rather than as a "null origin" sandboxed document.
                  Without it, the chess.com emboard breaks at boot:
                  it is a Vue + pinia app whose state-management layer
                  unconditionally reads/writes localStorage during
                  initialization, and a null-origin document throws
                  SecurityError on any localStorage access. It also
                  fetches its own /manifest.json from www.chess.com,
                  which a null-origin document is blocked from doing
                  by CORS. The result was a fully blank emboard.
                  Parent (our site) and iframe (chess.com) are
                  different origins, so MDN's "do not combine
                  allow-scripts and allow-same-origin" warning (which
                  is about same-origin iframes that could clear their
                  own sandbox) does not apply.
                  Phase B M-2 history note: the original SecurityEngineer
                  baseline omitted allow-same-origin; live testing showed
                  the embed cannot initialize without it.

              The chess.com emboard is a static diagram with no
              "open in new tab" affordance, so neither allow-popups
              nor allow-popups-to-escape-sandbox are needed.
            */}
            <iframe
              src={`https://www.chess.com/emboard?id=${attachment.embedId}`}
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
              loading="lazy"
              title="Chess.com diagram embed"
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>
    );
  }

  // Unknown provider — render nothing. As of Phase 13 (#83), the DB
  // CHECK constrains embed_provider to 'chesscom' only, so this branch
  // is unreachable in practice (Lichess embed URLs are routed to the
  // PGN attachment path and rendered by AttachedGameCard instead).
  // Surfacing nothing is the safest fallback for a drifted row.
  return null;
}
