'use client';

import { useState } from 'react';

import dynamic from 'next/dynamic';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { MiniBoard } from '@/app/[locale]/(public)/topics/openings/_components/MiniBoard';

/**
 * Subset of `post_game_attachments` columns that the card needs.
 *
 * @design Component contract
 *
 * `AttachedGameCard` MUST only ever be rendered for attachments whose
 * parent topic_post is non-soft-deleted. The visibility rule is enforced
 * by (a) the RLS SELECT policy on `post_game_attachments`, (b) the
 * application-layer query that filters `topic_posts.deleted_at IS NULL`,
 * and (c) this contract — three layers of defense per SPEC1 §5-1.
 *
 * @design Bundle split
 *
 * `finalFen` is computed server-side by `getAttachmentsForPosts`, so
 * the summary card can render its FEN thumbnail without importing
 * `chess.js` into the chunk-page first-paint client bundle. The
 * chess.js-bearing replay UI lives in `AttachedGameCardReplay` and
 * is loaded lazily via `next/dynamic({ ssr: false })` only when the
 * user clicks the "Open replay" button. See SPEC1 §5-1.
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

const AttachedGameCardReplay = dynamic(
  () => import('./AttachedGameCardReplay').then((m) => m.AttachedGameCardReplay),
  { ssr: false }
);

type Props = {
  attachment: AttachedGameCardData;
};

export function AttachedGameCard({ attachment }: Props) {
  const t = useTranslations('attachment');
  const [expanded, setExpanded] = useState(false);

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

  // For PGN-mode attachments, surface the sanitized [Site] header as
  // plain text (no auto-link, no <a href>) per SPEC1 §7-4.
  const pgnSiteText =
    attachment.source === 'pgn' && attachment.headerSite ? attachment.headerSite : null;

  return (
    <div className="mt-2 mb-2 rounded-md border border-border bg-card overflow-hidden">
      <div className="p-3 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
          <div className="w-32 shrink-0 mx-auto sm:mx-0">
            <MiniBoard fen={attachment.finalFen} responsive />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            {(attachment.headerWhite || attachment.headerBlack) && (
              <p className="text-sm font-medium text-foreground truncate">
                <span>{attachment.headerWhite ?? '?'}</span>
                <span className="text-muted-foreground"> vs </span>
                <span>{attachment.headerBlack ?? '?'}</span>
                {attachment.headerResult && attachment.headerResult !== '*' && (
                  <span className="text-muted-foreground ml-2">{attachment.headerResult}</span>
                )}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('card.movesCount', { count: attachment.moveCount })}
            </p>
            {attachment.headerEvent && (
              <p className="text-xs text-muted-foreground truncate">
                <span className="font-medium">{t('card.headerEvent')}: </span>
                <span>{attachment.headerEvent}</span>
              </p>
            )}
            {attachment.headerDate && (
              <p className="text-xs text-muted-foreground truncate">
                <span className="font-medium">{t('card.headerDate')}: </span>
                <span>{attachment.headerDate}</span>
              </p>
            )}
            {pgnSiteText && (
              <p className="text-xs text-muted-foreground truncate">
                <span className="font-medium">{t('card.headerSite')}: </span>
                <span>{pgnSiteText}</span>
              </p>
            )}
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="text-sm text-link-primary hover:underline"
            >
              {expanded ? t('card.collapseButton') : t('card.replayButton')}
            </button>
          </div>
        </div>

        {expanded && (
          <AttachedGameCardReplay pgn={attachment.pgn} fallbackFen={attachment.finalFen} />
        )}

        {lichessSource && (
          <p className="text-xs text-muted-foreground pt-1">
            <span>{t('card.sourceLabel')}: </span>
            <a
              href={lichessSource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link-primary hover:underline"
            >
              {lichessSource.label}
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
