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
 * Height of the default snippet, and the ratio behind it.
 *
 * The widget is a square board plus roughly 130px of chrome (move strip,
 * stepper, attribution), so a 600px-wide embed wants about 600 + 130. Pinned
 * at 480 rather than 730 because an article column is usually narrower than
 * 600px: at the ~560px a typical blog gives it, this leaves the board its full
 * width and a little slack. The widget itself never overflows whatever height
 * it is given — the board shrinks — so a blogger who edits this number gets a
 * sane result either way.
 */
export const DEFAULT_EMBED_HEIGHT = 480;

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
 * - `style` carries only `border:0` and the max-width. Some editors strip
 *   `style` entirely; losing it costs a border and a size cap, not the embed.
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
  return `<iframe src="${escapeAttribute(url)}" title="${escapeAttribute(title)}" width="100%" height="${height}" style="border:0;max-width:600px" loading="lazy"></iframe>`;
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
