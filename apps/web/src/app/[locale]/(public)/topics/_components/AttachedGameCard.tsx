'use client';

import { useState } from 'react';

import dynamic from 'next/dynamic';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MiniBoard } from '@/lib/positions/ui/MiniBoard';

const GameReplayModal = dynamic(() => import('./GameReplayModal').then((m) => m.GameReplayModal), {
  ssr: false,
});

/**
 * Subset of `post_game_pgn_attachments` columns that the card needs.
 *
 * @design Component contract
 *
 * `AttachedGameCard` MUST only ever be rendered for attachments whose
 * parent topic_post is non-soft-deleted. The visibility rule is enforced
 * by (a) the RLS SELECT policy on `post_game_pgn_attachments`, (b) the
 * application-layer query that filters `topic_posts.deleted_at IS NULL`,
 * and (c) this contract — three layers of defense per SPEC1 §5-1.
 *
 * @design Bundle split
 *
 * `finalFen` is computed server-side by `getAttachmentsForPosts`, so
 * the summary card can render its FEN thumbnail without importing
 * `chess.js` into the chunk-page first-paint client bundle. The
 * chess.js-bearing replay modal lives in `GameReplayModal` and is
 * loaded lazily via `next/dynamic({ ssr: false })` only when the
 * user taps the thumbnail to open the board review modal. See
 * SPEC1 §5-1.
 */
export type AttachedGameCardData = {
  id: string;
  source: string; // 'pgn' | 'lichess'
  sourceUrl: string | null;
  sourceGameId: string | null;
  pgn: string;
  moveCount: number;
  headerWhite: string | null;
  headerBlack: string | null;
  headerResult: string | null;
  headerEvent: string | null;
  headerSite: string | null;
  headerDate: string | null;
  anonymized: boolean;
  /** Off-platform game source identifier (currently 'chesscom' only).
   * NULL for on-platform / pure-PGN attachments. Paired with
   * `attributionPath`. The href is rebuilt server-side from these
   * components — never from a persisted source URL — so a hostile or
   * drifted source URL cannot land in the rendered DOM as a link. */
  attributionPlatform: string | null;
  /** URL pathname (e.g. '/game/live/12345') for the off-platform game.
   * NULL when `attributionPlatform` is NULL. Validated against a strict
   * allow-list both at parse time and via a DB CHECK constraint. */
  attributionPath: string | null;
  /** Pre-computed final-position FEN, used for the static thumbnail
   * so the summary card does not need chess.js on first paint. */
  finalFen: string;
};

type Props = {
  attachment: AttachedGameCardData;
};

export function AttachedGameCard({ attachment }: Props) {
  const t = useTranslations('attachment');
  const [modalOpen, setModalOpen] = useState(false);

  // Build the source attribution. For Lichess we ALWAYS rebuild the URL
  // from `sourceGameId` rather than trusting any persisted `sourceUrl`
  // value. This is defense in depth — the writer (`createChunkPostWithAttachment`)
  // always sets a canonical `https://lichess.org/{8-char-id}` URL today,
  // but if a future migration, admin tool, or direct REST write ever
  // landed a non-canonical value in `source_url`, that value would
  // otherwise become a clickable link in the public UI. Rebuilding from
  // the validated `sourceGameId` (which is constrained at parse time to
  // 8 alphanumerics by `LICHESS_URL_RE` / `LICHESS_GAME_ID_RE`) makes
  // the rendered href provably safe regardless of what the row carries.
  const lichessSource =
    attachment.source === 'lichess' && attachment.sourceGameId
      ? {
          label: `lichess.org/${attachment.sourceGameId}`,
          href: `https://lichess.org/${attachment.sourceGameId}`,
        }
      : null;

  // chess.com attribution. Same defense-in-depth posture as Lichess: we
  // ignore the persisted `sourceUrl` and rebuild the href from the
  // (attribution_platform, attribution_path) pair. The path was
  // validated by `parseChesscomAttribution` at write time AND by the
  // `chk_attribution_path_format` DB CHECK, so its character set is
  // pinned to `[A-Za-z0-9/_-]{1,128}`. The label uses the `viewOnChesscom`
  // i18n key rather than echoing the path verbatim — an arbitrary path
  // is not user-friendly link text and reduces the surface for any
  // future bypass that might land a hostile-looking string in the path.
  //
  // `rel="noopener noreferrer nofollow"`:
  //   - noopener / noreferrer — standard cross-origin link hardening
  //   - nofollow — UGC link, do not transfer PageRank (avoids being
  //     drafted into SEO link farms via comment-attachment posts).
  const chesscomSource =
    attachment.attributionPlatform === 'chesscom' && attachment.attributionPath
      ? {
          href: `https://www.chess.com${attachment.attributionPath}`,
        }
      : null;

  // For PGN-mode attachments, surface the sanitized [Site] header as
  // plain text (no auto-link, no <a href>) per SPEC1 §7-4.
  const pgnSiteText =
    attachment.source === 'pgn' && attachment.headerSite ? attachment.headerSite : null;

  return (
    <div className="mt-2 mb-2 rounded-md border border-border bg-card overflow-hidden">
      <div className="p-3 space-y-2">
        {/* TODO(i18n): attachment.game.cardTitle — paired with
            `Attached position` in AttachedFenCard so both attachment
            kinds wear the same "this is an attached X" label. */}
        <p className="text-sm font-medium text-foreground">Attached game</p>
        <div className="flex flex-col sm:flex-row sm:items-start sm:gap-3 gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-32 shrink-0 mx-auto sm:mx-0 cursor-pointer block focus:outline-none focus-visible:ring-2 focus-visible:ring-link-primary rounded-sm"
            // TODO(i18n): attachment.game.openReplayLabel
            aria-label="Open game replay"
          >
            <MiniBoard fen={attachment.finalFen} responsive />
          </button>
          {/* The metadata column is always rendered with the same set
              of rows so the layout stays identical between PGN exports
              that carry full headers and bare PGN bodies. Missing
              header values fall back to `?` / `????` placeholders
              (matching the chess.js default `Date "????.??.??"` shape)
              instead of being hidden, which used to leave the column
              shorter than the board and visually centered the residual
              rows. */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground truncate">
              <span>{attachment.headerWhite ?? '?'}</span>
              <span className="text-muted-foreground"> vs </span>
              <span>{attachment.headerBlack ?? '?'}</span>
              {attachment.headerResult && attachment.headerResult !== '*' && (
                <span className="text-muted-foreground ml-2">{attachment.headerResult}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('card.movesCount', { count: attachment.moveCount })}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium">{t('card.headerDate')}: </span>
              <span>{attachment.headerDate ?? '????.??.??'}</span>
            </p>
            {attachment.source === 'pgn' && (
              <p className="text-xs text-muted-foreground truncate">
                <span className="font-medium">{t('card.headerSite')}: </span>
                <span>{pgnSiteText ?? '????'}</span>
              </p>
            )}
          </div>
        </div>

        {modalOpen && (
          <GameReplayModal
            pgn={attachment.pgn}
            fallbackFen={attachment.finalFen}
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
          />
        )}

        {lichessSource && (
          <p className="text-xs text-muted-foreground pt-1">
            <span>{t('card.sourceLabel')}: </span>
            {/*
              `rel="noopener noreferrer nofollow"` matches the chess.com
              attribution link below (Phase H L-1):
                - noopener / noreferrer — standard cross-origin link hardening
                - nofollow — UGC link, do not transfer PageRank to lichess.org
                  via comment-attachment posts, same posture as chess.com.
            */}
            <a
              href={lichessSource.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-link-primary hover:underline"
            >
              {lichessSource.label}
            </a>
          </p>
        )}

        {chesscomSource && (
          <p className="text-xs text-muted-foreground pt-1">
            <span>{t('card.sourceLabel')}: </span>
            <a
              href={chesscomSource.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-link-primary hover:underline"
            >
              {t('card.viewOnChesscom')}
            </a>
          </p>
        )}

        {attachment.anonymized && (
          <p className="text-xs text-muted-foreground italic">{t('card.anonymizedNote')}</p>
        )}
      </div>
    </div>
  );
}
