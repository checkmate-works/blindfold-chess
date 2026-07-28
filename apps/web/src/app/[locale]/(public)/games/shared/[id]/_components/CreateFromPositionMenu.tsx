'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiPlus } from 'react-icons/fi';

import { MOVE_NAV_SIDE_BUTTON_CLASS } from '@/app/[locale]/(public)/games/play/_components/MoveNavigationRow';
import { ActionsMenu } from '@/app/[locale]/_components/ActionsMenu';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  /** Position currently on the board — seeds every destination via `?fen=`. */
  currentFen: string;
  /**
   * The game's next move (SAN) from this position. Seeded as a puzzle's draft
   * solution (`?solution=`). Undefined at the final position (no continuation).
   */
  continuationSan?: string;
};

/**
 * "Create from this position" — a single position-anchored entry point that
 * groups the authoring destinations a viewer can seed from the current board:
 * a chunk, a position-memory entry, or a puzzle (the latter pre-filled with the
 * game's continuation as a draft solution). Shown only to signed-in viewers;
 * each item is a plain link so the seeding contract stays in the URL.
 *
 * @design Lives in the board's control strip, behind a "+"
 *
 * It reads the position the board currently shows, so it belongs beside the
 * ply it reads and steps with it — the same reasoning that put the repertoire
 * line's "branch from here" in that strip. It was previously a labelled button
 * at the top of the per-move panel, which on a phone left it sitting between
 * the board and the comment thread discussing that same move.
 *
 * The trigger stays a "+", not the "⋯" this menu's {@link ActionsMenu} base
 * renders by default: "⋯" is already spoken for on this very page by
 * `OwnerActions`, where it means "more actions on this game". These three items
 * are not an overflow — they are one intent (author something new), and a
 * second "⋯" with a different meaning would split the glyph. The popup opens
 * upward because the strip sits at the bottom edge of a card that clips its
 * descendants (`INLINE_BOARD_CARD_CHROME`).
 */
export function CreateFromPositionMenu({ locale, currentFen, continuationSan }: Props) {
  const t = useTranslations('sharedGames.create');

  const fen = encodeURIComponent(currentFen);
  const puzzleHref =
    `/${locale}/practice/puzzle/new?fen=${fen}` +
    (continuationSan ? `&solution=${encodeURIComponent(continuationSan)}` : '');

  // Chunk first (most common), then position-memory, then puzzle (heaviest).
  const items = [
    { key: 'chunk', label: t('chunk'), href: `/${locale}/chunks/new?fen=${fen}` },
    {
      key: 'positionMemory',
      label: t('positionMemory'),
      href: `/${locale}/practice/position-memory/new?fen=${fen}`,
    },
    { key: 'puzzle', label: t('puzzle'), href: puzzleHref },
  ];

  return (
    // The help tour finds its target by `data-tour-id`; the wrapper carries it
    // so the highlight tracks the trigger's box without ActionsMenu having to
    // grow a passthrough for one caller.
    <span data-tour-id="game-create-from-position" className="inline-flex shrink-0">
      <ActionsMenu
        ariaLabel={t('menuLabel')}
        items={items}
        icon={<FiPlus className="h-4 w-4" aria-hidden />}
        triggerClassName={MOVE_NAV_SIDE_BUTTON_CLASS}
        placement="top"
      />
    </span>
  );
}
