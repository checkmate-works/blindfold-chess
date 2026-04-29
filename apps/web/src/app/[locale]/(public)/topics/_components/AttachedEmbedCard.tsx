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
 * @design postMessage handler — DEFER
 *
 * Phase B does NOT install a `window.addEventListener('message', ...)`
 * listener (D3 — dead code reduction + smaller attack surface). If a
 * future feature needs to consume Lichess embed move events, the
 * listener MUST pin origin: `if (event.origin !== 'https://lichess.org') return;`
 * — never `'*'`, never substring match, never `endsWith('lichess.org')`.
 * It must also validate `event.source === iframeRef.current?.contentWindow`
 * and treat `event.data` as untrusted input.
 */
export type AttachedEmbedCardData = {
  id: string;
  embedProvider: string; // 'chesscom' | 'lichess'
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
          {/* aspect-square: chess.com emboard renders an 8x8 board (square).
              Manual verification step (deferred to merge): confirm that the
              chess.com emboard fits the square frame at the chosen width
              breakpoints; if there is a controls bar that pushes the layout
              out of square, revisit. */}
          <div className="aspect-square w-full">
            <iframe
              src={`https://www.chess.com/emboard?id=${attachment.embedId}`}
              sandbox="allow-scripts"
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

  if (attachment.embedProvider === 'lichess') {
    // Lichess attribution. `attribution_path` is auto-derived as
    // `/{embedId}` at write time per Q2, so this resolves to
    // `https://lichess.org/{embedId}` — safe per D7 (rebuild from
    // validated components, never use persisted source_url as href).
    //
    // Defense in depth: even though the writer always sets
    // attributionPath to `/${embedId}`, we still cross-check that the
    // path matches that shape before rendering. A drifted DB row with a
    // surprise path will fall back to no attribution link rather than
    // becoming a clickable link to wherever.
    const expectedPath = `/${attachment.embedId}`;
    const lichessHref =
      attachment.attributionPlatform === 'lichess' && attachment.attributionPath === expectedPath
        ? `https://lichess.org${expectedPath}`
        : null;

    return (
      <div className="mt-2 mb-2 rounded-md border border-border bg-card overflow-hidden">
        <div className="p-3 space-y-2">
          <p className="text-sm font-medium text-foreground">{t('embed.lichessCardTitle')}</p>
          <div className="aspect-video w-full">
            <iframe
              src={`https://lichess.org/embed/${attachment.embedId}?theme=auto&bg=auto`}
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              loading="lazy"
              title="Lichess game replay"
              className="w-full h-full border-0"
            />
          </div>
          {lichessHref && (
            <p className="text-xs text-muted-foreground pt-1">
              <a
                href={lichessHref}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-link-primary hover:underline"
              >
                {t('embed.viewOnLichess')}
              </a>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Unknown provider — render nothing. The DB CHECK constrains
  // embed_provider to 'chesscom' | 'lichess', so this branch is
  // unreachable in practice; surfacing nothing is the safest fallback.
  return null;
}
