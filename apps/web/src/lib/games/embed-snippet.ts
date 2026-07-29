import type { BoardTheme } from '@/lib/games/board-themes';

import { encodeGameShortId } from './short-id';

/**
 * The embed's display choices, as the share dialog offers them. Mirrors
 * `EmbedGameParams` (see `app/embed/_lib/embed-params.ts`) but in the
 * dialog's vocabulary: every field has an explicit "leave it to the reader"
 * member, because the interesting default is not a value but the *absence* of
 * the param.
 */
export type EmbedOptions = {
  /** `'played'` reproduces the blindfold; `'plain'` shows the revealed board. */
  view: 'played' | 'plain';
  /** `'player'` = the game's own player at the bottom, i.e. no `color` param. */
  orientation: 'player' | 'white' | 'black';
  /** `'auto'` follows the reader's OS setting rather than pinning a scheme. */
  bg: 'auto' | 'light' | 'dark';
  /** `null` negotiates the reader's own language; a locale pins the widget. */
  lang: string | null;
  theme?: BoardTheme;
  /**
   * Half-moves applied at open. `null` starts at the opening board, which is
   * where a reader of an article wants to begin.
   */
  ply?: number | null;
};

export const DEFAULT_EMBED_OPTIONS: EmbedOptions = {
  view: 'played',
  orientation: 'player',
  bg: 'auto',
  lang: null,
};

/**
 * Cap on the embed's width. Below the 600px a desktop column could give it,
 * because the widget is a *square* board plus chrome: every extra pixel of
 * width costs the same in height, and a 740px-tall block is more of an article
 * than a game replay should take.
 */
const DEFAULT_EMBED_MAX_WIDTH = 480;

/**
 * Non-board vertical space in the widget: move strip (37) + stepper (57) +
 * attribution (33) + the board's own padding (16). Measured, not guessed — if
 * the chrome changes materially, {@link DEFAULT_EMBED_ASPECT_RATIO} drifts and
 * a gap re-appears at one end of the range.
 */
const EMBED_CHROME_HEIGHT = 143;

/**
 * The snippet's height is expressed as a ratio of its width, not as a fixed
 * number, because the width is fluid: an article column is ~480px on a laptop
 * and ~330px on a phone, and the board — being square — takes the smaller of
 * the two axes it is given. Against a fixed height, a phone-width embed spent
 * the difference on empty space above and below the board.
 *
 * A single ratio cannot be exact at every width (the chrome is a constant, not
 * a proportion), so it is set to be exact at the width cap and to fall
 * slightly short below it. That direction is deliberate: falling short leaves
 * a small gutter left and right of a centred board, which reads as framing,
 * while overshooting leaves the dead space above and below that this replaced.
 */
export const DEFAULT_EMBED_ASPECT_RATIO = `${DEFAULT_EMBED_MAX_WIDTH} / ${DEFAULT_EMBED_MAX_WIDTH + EMBED_CHROME_HEIGHT}`;

/**
 * Height for the `height` attribute, which is what a reader gets if the CMS
 * strips `style` — some editors do. It is a plain fallback, deliberately not
 * the ratio's answer for any particular width: nothing is exact once the ratio
 * is gone, and a mid-range value keeps that case merely imperfect rather than
 * broken.
 */
export const DEFAULT_EMBED_HEIGHT = 560;

/**
 * Build the embed URL, omitting every param that is already the default.
 *
 * Short URLs are not cosmetic here: this string is pasted into an HTML editor
 * where it is read and sometimes hand-edited, and a param that merely restates
 * a default invites the reader to think it is load-bearing.
 */
export function buildEmbedUrl(siteUrl: string, gameId: string, options: EmbedOptions): string {
  const params = new URLSearchParams();
  if (options.view !== 'played') params.set('view', options.view);
  if (options.orientation !== 'player') params.set('color', options.orientation);
  if (options.bg !== 'auto') params.set('bg', options.bg);
  if (options.lang) params.set('lang', options.lang);
  if (options.theme) params.set('theme', options.theme);
  if (options.ply != null) params.set('ply', String(options.ply));

  const query = params.toString();
  return `${siteUrl}/embed/g/${encodeGameShortId(gameId)}${query ? `?${query}` : ''}`;
}

/**
 * Build the `<iframe>` snippet a blogger pastes into their post.
 *
 * Attribute choices, all of which are about surviving somebody else's CMS:
 *
 * - `width="100%"` with a `max-width`, not a fixed pixel width — an article
 *   column is a different width on every site and on every phone, and a fixed
 *   600px embed is the classic cause of a page that scrolls sideways on
 *   mobile.
 * - `aspect-ratio` with `height:auto`, so the height follows that fluid width
 *   instead of being a number chosen for one screen. See
 *   {@link DEFAULT_EMBED_ASPECT_RATIO}.
 * - The `height` attribute stays anyway, as the answer for a CMS that strips
 *   `style` — a stripped snippet then loses the ratio and the cap but still
 *   renders a usable widget, which a single-element responsive trick (a
 *   `padding-bottom` wrapper) would not: that one collapses to zero height
 *   with its style gone.
 * - `title` because an untitled iframe is an unlabelled document to a screen
 *   reader — the blogger's readers pay for that, not us.
 * - `loading="lazy"` so an article embedding several games does not fetch them
 *   all before the reader scrolls.
 * - No `frameborder` / `allowfullscreen`: the first is obsolete (the `style`
 *   does that job) and the second grants a capability the widget never uses.
 */
export function buildEmbedSnippet({
  siteUrl,
  gameId,
  title,
  options,
  height = DEFAULT_EMBED_HEIGHT,
}: {
  siteUrl: string;
  gameId: string;
  /** The game's title — becomes the frame's accessible name. */
  title: string;
  options: EmbedOptions;
  height?: number;
}): string {
  const url = buildEmbedUrl(siteUrl, gameId, options);
  const style = `border:0;width:100%;max-width:${DEFAULT_EMBED_MAX_WIDTH}px;aspect-ratio:${DEFAULT_EMBED_ASPECT_RATIO};height:auto`;
  return `<iframe src="${escapeAttribute(url)}" title="${escapeAttribute(title)}" width="100%" height="${height}" style="${style}" loading="lazy"></iframe>`;
}

/**
 * Escape a value going into a double-quoted HTML attribute.
 *
 * The game title is user-supplied text landing in markup that someone else
 * will paste into their own site. `&` first, or the escapes escape each other.
 */
function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
