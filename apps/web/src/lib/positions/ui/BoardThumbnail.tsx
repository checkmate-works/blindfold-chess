import type { BlindfoldDisplaySettings } from '@blindfold-chess/features/board-display';
import { resolvePieceDisplay } from '@blindfold-chess/features/board-display';
import { ChessPieceIcon } from '@blindfold-chess/icons';
import type { PieceType } from '@blindfold-chess/types';

import { BoardAnnotationOverlay } from '@/lib/board-annotations/BoardAnnotationOverlay';
import type { BoardAnnotations } from '@/lib/board-annotations/types';
import type { BoardTheme } from '@/lib/games/board-themes';
import { DEFAULT_BOARD_THEME, getBoardThemeColors } from '@/lib/games/board-themes';
import { goStoneStyle } from '@/lib/games/go-stone-style';

type Props = {
  fen: string;
  className?: string;
  boardTheme?: BoardTheme;
  /**
   * Optional display-only annotations (arrows + circles) drawn on top of
   * the board. Skipped when `null` / omitted. Already-parsed shape — the
   * caller is responsible for routing the JSONB through
   * `parseBoardAnnotations`.
   */
  annotations?: BoardAnnotations | null;
  /**
   * Override the default orientation (auto-flip when black is to move).
   * Pass when the viewer has a fixed perspective — e.g. the game review's
   * starting-position board, which always shows the player's own side at
   * the bottom regardless of whose turn the position is.
   */
  flipped?: boolean;
  /**
   * Optional blindfold "as played" treatment. When set, every piece is routed
   * through the pure `resolvePieceDisplay`, so the preview reflects how the
   * game was actually played — hidden pieces as faint ghosts, obfuscated
   * shapes as Go stones, a single-colour game as all-white/all-black — rather
   * than the plain opening position. Omit / null for a normal, fully-sighted
   * thumbnail. Build it for a published game with
   * `playSettingsToThumbnailDisplay`.
   */
  displaySettings?: BlindfoldDisplaySettings | null;
};

type Color = 'w' | 'b';

/**
 * Render one occupied square's piece. With no `displaySettings` this is the
 * plain icon (the historical behaviour); with them, the pure display rule
 * decides between absent / ghost / Go-stone / recoloured / normal — the same
 * decision the interactive `ChessBoard` makes, so the thumbnail and the detail
 * board agree.
 */
function renderThumbnailPiece(
  piece: { type: PieceType; color: Color },
  displaySettings: BlindfoldDisplaySettings | null
) {
  if (!displaySettings) {
    return <ChessPieceIcon type={piece.type} color={piece.color} className="w-[80%] h-[80%]" />;
  }

  const display = resolvePieceDisplay(piece, displaySettings);
  switch (display.kind) {
    case 'absent':
      return null;
    case 'ghost':
      return (
        <div className="flex h-[80%] w-[80%] items-center justify-center opacity-40">
          <ChessPieceIcon type={display.type} color={display.color} className="h-full w-full" />
        </div>
      );
    case 'circle':
      // A faint stone is a hidden one — same fade as the ghost above.
      return (
        <div
          className={`w-[60%] h-[60%] rounded-full ${display.faint ? 'opacity-40' : ''}`}
          style={goStoneStyle(display.color)}
        />
      );
    case 'piece':
      return (
        <ChessPieceIcon type={display.type} color={display.color} className="w-[80%] h-[80%]" />
      );
  }
}

// The helpers below intentionally avoid `fenToBoard` / `isBlackToMoveFromFen`
// from `@blindfold-chess/features/chess-core`: those implementations depend on
// `chess.js`, which would defeat the purpose of keeping this file a
// chess-core-free React Server Component (we do not want chess.js pulled into
// any client bundle that imports this thumbnail transitively). If a
// chess.js-free alternative ever lands in `@blindfold-chess/features/chess-core/fen`,
// replace these inline helpers with imports from that subentry.
function parseFenChar(ch: string): { type: PieceType; color: Color } | null {
  if (ch >= 'A' && ch <= 'Z') {
    const lower = ch.toLowerCase();
    if (/^[kqrbnp]$/.test(lower)) {
      return { type: lower as PieceType, color: 'w' };
    }
    return null;
  }
  if (/^[kqrbnp]$/.test(ch)) {
    return { type: ch as PieceType, color: 'b' };
  }
  return null;
}

function parseFenPlacement(fen: string): (string | null)[][] {
  const placement = fen.split(' ')[0];
  return placement.split('/').map((rank) => {
    const row: (string | null)[] = [];
    for (const ch of rank) {
      if (ch >= '1' && ch <= '8') {
        row.push(...Array<null>(Number(ch)).fill(null));
      } else {
        row.push(ch);
      }
    }
    return row;
  });
}

function isBlackToMove(fen: string): boolean {
  return fen.split(' ')[1] === 'b';
}

/**
 * Purely presentational, non-interactive chess board rendered entirely as a
 * React Server Component. Intentionally does NOT depend on
 * `@blindfold-chess/features/chess-core` — the FEN parsing is a small inline
 * function, so the heavy `chess.js` bundle never ships to the client for any
 * page that only uses this thumbnail.
 *
 * For interactive boards with animations, selection, etc., use
 * `AnimatedChessBoard` or `ChessBoard` instead.
 */
export function BoardThumbnail({
  fen,
  className = 'w-20 h-20 sm:w-24 sm:h-24',
  boardTheme = DEFAULT_BOARD_THEME,
  annotations = null,
  flipped: flippedOverride,
  displaySettings = null,
}: Props) {
  const themeColors = getBoardThemeColors(boardTheme);
  const flipped = flippedOverride ?? isBlackToMove(fen);

  const ranks = parseFenPlacement(fen);
  const board = flipped ? [...ranks].reverse().map((rank) => [...rank].reverse()) : ranks;

  return (
    <div className={className}>
      <div className="relative grid grid-cols-8 rounded-sm overflow-hidden aspect-square w-full h-full">
        {board.map((rank, rankIdx) =>
          rank.map((fenChar, fileIdx) => {
            const isLight = (rankIdx + fileIdx) % 2 === 0;
            const piece = fenChar ? parseFenChar(fenChar) : null;
            return (
              <div
                key={`${rankIdx}-${fileIdx}`}
                className={`flex items-center justify-center aspect-square ${isLight ? themeColors.light : themeColors.dark}`}
              >
                {piece ? renderThumbnailPiece(piece, displaySettings) : null}
              </div>
            );
          })
        )}
        {annotations && <BoardAnnotationOverlay annotations={annotations} flipped={flipped} />}
      </div>
    </div>
  );
}
