import { SUPPORTED_LOCALES } from '@/config';
import { BOARD_THEMES } from '@blindfold-chess/types';
import type { Side } from '@blindfold-chess/types';

import type { BoardTheme } from '@/lib/games/board-themes';
import type { GameGifVariant } from '@/lib/games/gif/constants';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Query parameters of an embedded game replay.
 *
 * These are the knobs a blogger writes by hand into an `<iframe src>`, so
 * every one of them is optional and **no value can fail the page**: a typo,
 * a stale param from an older embed code, or a duplicated key degrades to the
 * default instead of erroring. An embed that 400s is a broken box in someone
 * else's article, discovered long after they published it — strictly worse
 * than one that quietly renders the standard view.
 *
 * Names follow the vocabulary already used elsewhere in the app rather than
 * inventing an embed dialect: `view` matches the GIF route's `?view=played`,
 * `color` matches the shared-game page's board-orientation param.
 */
export type EmbedGameParams = {
  /**
   * `'played'` reproduces the blindfold view the player actually had (hidden
   * pieces drawn as ghosts, folded per position); `'plain'` shows the fully
   * revealed board. Defaults to `'played'` — that is the whole reason to
   * embed a game from this site rather than from a general chess server, and
   * it degrades to an ordinary board by itself for a fully-sighted game.
   */
  view: GameGifVariant;
  /** Side at the bottom of the board. Undefined = the player's own side. */
  orientation: Side | undefined;
  /** Board colour scheme. Undefined = the app default. */
  theme: BoardTheme | undefined;
  /**
   * Half-moves applied at open: 0 is the starting position, 1 is after
   * White's first move. Undefined = start at the beginning, because a reader
   * meets the embed inside an article and steps forward from move one; the
   * in-app replay opens at the final position instead, where the viewer
   * arrived deliberately to see how the game ended.
   */
  ply: number | undefined;
  /** UI language. Undefined = negotiate from the visitor's `Accept-Language`. */
  lang: Locale | undefined;
  /**
   * Force the widget's colour scheme, so it can be matched to the host page.
   * Undefined follows the visitor's OS setting, which is the best guess
   * available: an iframe cannot read the theme of the site around it.
   */
  bg: 'light' | 'dark' | undefined;
};

/** First value of a repeated key, so `?view=a&view=b` behaves predictably. */
function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseEmbedParams(
  searchParams: Record<string, string | string[] | undefined>
): EmbedGameParams {
  const view = single(searchParams.view);
  const color = single(searchParams.color);
  const theme = single(searchParams.theme);
  const lang = single(searchParams.lang);
  const bg = single(searchParams.bg);
  // Matched as a literal decimal rather than fed to `Number()`, which reads
  // `''` and `' '` (i.e. a bare `?ply=`) as 0 — "start at the opening board"
  // is a meaningful request here, and an empty param is not making it.
  const plyDigits = single(searchParams.ply)?.match(/^\d+$/)?.[0];

  return {
    view: view === 'plain' ? 'plain' : 'played',
    orientation: color === 'white' || color === 'black' ? color : undefined,
    theme: BOARD_THEMES.find((known) => known === theme),
    // Only the lower bound is checked here; the upper one depends on the
    // game's length and is clamped by the caller.
    ply:
      plyDigits !== undefined && Number.isSafeInteger(Number(plyDigits))
        ? Number(plyDigits)
        : undefined,
    lang: SUPPORTED_LOCALES.find((known) => known === lang),
    bg: bg === 'light' || bg === 'dark' ? bg : undefined,
  };
}

/**
 * Same parse from a raw query string — the form the embed layout has, since
 * layouts receive no `searchParams` and read `x-search` (set by `src/proxy.ts`)
 * instead. Repeated keys collapse to the first, matching {@link parseEmbedParams}.
 */
export function parseEmbedParamsFromSearch(search: string): EmbedGameParams {
  const params = new URLSearchParams(search);
  // Keyed off `get()`, which is the FIRST value for a key — `fromEntries()`
  // over the entry list keeps the last one instead. The two parses have to
  // agree on which wins: this one resolves `?lang` for the layout's
  // `<html lang>`, while the page resolves the same param through
  // `parseEmbedParams`, and disagreement renders the document's declared
  // language and the widget's own strings in two different languages.
  return parseEmbedParams(
    Object.fromEntries([...params.keys()].map((key) => [key, params.get(key)!]))
  );
}
