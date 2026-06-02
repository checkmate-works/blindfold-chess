'use client';

import { DiscPiece } from '@/app/_components/chess/DiscPiece';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { ChessPieceIcon } from '@blindfold-chess/icons';

import { BOARD_VISIBILITY_ICON } from '@/lib/games/board-visibility-icons';
import type { GamePlaySettings } from '@/lib/games/saved-game-types';

type Props = {
  settings: GamePlaySettings;
  playerColor: 'white' | 'black';
};

/**
 * "How the player saw this position" — the blindfold difficulty as compact
 * icons. Shows the board-visibility icon plus, when the board was visible at all
 * and the pieces deviate from normal, a two-cell sample of how the player saw
 * their own vs. the opponent's pieces (shape + color, slashed when that side
 * was hidden).
 *
 * Client component (unlike the rest of the detail view, which is server-side)
 * because it lives inside the replay and re-renders as the viewer steps through
 * the moves: `settings` is the effective state at the *currently displayed*
 * position, folded from the start-of-game snapshot plus the change log. The
 * caller decides whether to render this at all (a game that was fully sighted
 * throughout has nothing to surface); this component always renders its content
 * for the position it is handed.
 */
export function PlaySettingsIndicator({ settings, playerColor }: Props) {
  const t = useTranslations('sharedGames.playSettings');
  const VisibilityIcon = BOARD_VISIBILITY_ICON[settings.boardVisibility];

  const piecesDeviate =
    !settings.showOwnPieces ||
    !settings.showOpponentPieces ||
    settings.pieceShapeMode !== 'normal' ||
    settings.pieceColors !== 'normal';

  const colorFor = (side: 'own' | 'opponent'): 'w' | 'b' => {
    if (settings.pieceColors === 'white-only') return 'w';
    if (settings.pieceColors === 'black-only') return 'b';
    const ownIsWhite = playerColor === 'white';
    return side === 'own' ? (ownIsWhite ? 'w' : 'b') : ownIsWhite ? 'b' : 'w';
  };
  const isDisc = (side: 'own' | 'opponent') =>
    settings.pieceShapeMode === 'circles-all' ||
    settings.pieceShapeMode === (side === 'own' ? 'circles-own' : 'circles-opponent');

  // Piece appearance only matters when the board was visible at some point.
  const showPieceSample = settings.boardVisibility !== 'never' && piecesDeviate;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{t('title')}</span>

      <span
        className="inline-flex items-center gap-1.5"
        title={t(`visibility.${settings.boardVisibility}`)}
      >
        <VisibilityIcon className="h-4 w-4" aria-hidden />
        <span>{t(`visibility.${settings.boardVisibility}`)}</span>
      </span>

      {showPieceSample && (
        <span className="inline-flex items-center gap-1.5">
          {(['own', 'opponent'] as const).map((side) => {
            const visible = side === 'own' ? settings.showOwnPieces : settings.showOpponentPieces;
            const label = side === 'own' ? t('own') : t('opponent');
            return (
              <span
                key={side}
                className="relative inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-muted"
                title={visible ? label : `${label} (${t('hidden')})`}
                aria-label={visible ? label : `${label} (${t('hidden')})`}
              >
                <span className={visible ? '' : 'opacity-25'}>
                  {isDisc(side) ? (
                    <DiscPiece color={colorFor(side)} size={18} />
                  ) : (
                    <ChessPieceIcon type="p" color={colorFor(side)} size={20} />
                  )}
                </span>
                {!visible && (
                  <svg
                    viewBox="0 0 24 24"
                    className="absolute inset-0 h-full w-full text-destructive/70"
                    aria-hidden
                  >
                    <line
                      x1="4"
                      y1="20"
                      x2="20"
                      y2="4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </span>
            );
          })}
        </span>
      )}
    </div>
  );
}
