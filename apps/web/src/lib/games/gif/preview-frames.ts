import type { GameFrameSource, GifFrame } from '@/lib/games/gif/build-game-frames';
import { buildGameFrames, hasAnnotatableOps } from '@/lib/games/gif/build-game-frames';
import type { GameGifVariant } from '@/lib/games/gif/constants';
import { gameUsedNotablePlaySettings } from '@/lib/games/play-settings-log';

/**
 * Frames a pre-publish preview plays before looping — roughly the game's first
 * ten seconds.
 *
 * Deliberately a small prefix of the real sequence rather than the whole thing:
 * the preview is a pitch for the download, not a substitute for it, and a short
 * loop reads in a modal where a full 60-move replay would not. Building fewer
 * frames also keeps the modal's first paint cheap.
 */
export const PREVIEW_MAX_FRAMES = 16;

/** A game's frames plus the variant they were built for — what the preview needs. */
export type GifPreviewSource = {
  source: GameFrameSource;
  variant: GameGifVariant;
};

/**
 * Whether a game's `'played'` GIF would differ from its `'plain'` one at all.
 *
 * True when the blindfold settings themselves did something worth reproducing,
 * OR when the player left an annotatable trace: a fully-sighted game can still
 * have had a peek, an undo, or a typo. Gates both the shared page's "Download
 * GIF (as played)" item and which variant the pre-publish preview plays, so the
 * teaser can never advertise a variant the download does not offer.
 */
export function hasPlayedGifVariant(
  game: Pick<GameFrameSource, 'playSettings' | 'playSettingsLog' | 'operationLogs'>
): boolean {
  const canReproduce =
    game.playSettings != null &&
    gameUsedNotablePlaySettings(game.playSettings, game.playSettingsLog);
  return canReproduce || hasAnnotatableOps(game.operationLogs);
}

/**
 * The leading {@link PREVIEW_MAX_FRAMES} frames of the GIF this game would
 * produce — same builder, same delays, so what the preview plays is what the
 * downloaded file animates (just cut short).
 *
 * A game shorter than the cap is returned whole, final termination mark and
 * its long closing beat included.
 */
export function buildGamePreviewFrames(
  game: GameFrameSource,
  variant: GameGifVariant,
  maxFrames: number = PREVIEW_MAX_FRAMES
): GifFrame[] {
  return buildGameFrames(game, variant).slice(0, maxFrames);
}
