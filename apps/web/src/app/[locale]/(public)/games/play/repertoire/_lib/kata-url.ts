/**
 * The kata check page's URL contract, in one place: the route path, the
 * search-param names, and the parse/build pair over them. The deep-link
 * builder (`build-kata-path`), the page's own param parsing, and every
 * self-link the page renders (picker cards, side menu) all go through here,
 * so a param can't be renamed in one spot and missed in another.
 */

/** Locale-less route path; callers prepend `/${locale}` where needed. */
export const KATA_CHECK_PATH = '/games/play/repertoire';

export type KataCheckParams = {
  /** SAN moves of the finished game; null when absent or malformed. */
  moves: string[] | null;
  playerColor: 'white' | 'black';
  /** Custom starting position; undefined for the standard start. */
  startingFen?: string;
  gameId?: string;
  /** The kata chosen in the picker; undefined while still picking. */
  repertoireId?: string;
};

/** The `moves` param is the same JSON SAN array the Recall deep-link carries. */
function parseMoves(param: string | string[] | undefined): string[] | null {
  if (typeof param !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(param);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((m) => typeof m === 'string')) {
      return parsed;
    }
  } catch {
    // Malformed JSON → treated as missing.
  }
  return null;
}

function optional(param: string | string[] | undefined): string | undefined {
  return typeof param === 'string' && param ? param : undefined;
}

export function parseKataCheckParams(
  sp: Record<string, string | string[] | undefined>
): KataCheckParams {
  return {
    moves: parseMoves(sp.moves),
    playerColor: sp.color === 'black' ? 'black' : 'white',
    startingFen: optional(sp.fen),
    gameId: optional(sp.gameId),
    repertoireId: optional(sp.repertoire),
  };
}

/** Serialize check params back into the query string `parseKataCheckParams` reads. */
export function buildKataCheckQuery(params: {
  moves: readonly string[];
  playerColor: string;
  startingFen?: string;
  gameId?: string;
  repertoireId?: string;
}): string {
  const p = new URLSearchParams();
  p.set('moves', JSON.stringify(params.moves));
  p.set('color', params.playerColor);
  if (params.startingFen) p.set('fen', params.startingFen);
  if (params.gameId) p.set('gameId', params.gameId);
  if (params.repertoireId) p.set('repertoire', params.repertoireId);
  return p.toString();
}
