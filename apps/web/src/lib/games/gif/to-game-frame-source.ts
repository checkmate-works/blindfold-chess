import type { GameFrameSource } from '@/lib/games/gif/build-game-frames';
import type { Game } from '@/lib/games/saved-game-types';
import { toReviewData } from '@/lib/games/to-review-data';

/**
 * Project a local (localStorage) {@link Game} onto the frame-builder's input,
 * so the result screen can preview the GIF its game would produce before the
 * game is published.
 *
 * The blindfold-settings narrowing is delegated to {@link toReviewData} — the
 * same projection the publish path applies — rather than repeated here, so the
 * preview folds exactly the settings the published game will carry. Only
 * `undoneLogs` is read straight off the game: it drives the undo reenactment
 * frames and is not part of the review view model.
 */
export function toGameFrameSource(game: Game): GameFrameSource {
  const review = toReviewData(game);
  return {
    moves: review.moves,
    startingFen: review.startingFen,
    setupPlies: review.setupPlies,
    playerColor: review.playerColor,
    result: review.result,
    playSettings: review.playSettings,
    playSettingsLog: review.playSettingsLog,
    operationLogs: review.operationLogs,
    undoneLogs: game.undoneLogs ?? null,
  };
}
