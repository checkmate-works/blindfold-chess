/**
 * `'played'` variant render-rule version. Bump whenever a change alters the
 * output bytes for that variant (a new overlay, a delay tweak, an encoding
 * parameter). It is embedded in both the Storage cache key and the client's
 * fetch URL, so a bump invalidates the generated-GIF cache in Storage and the
 * browser/CDN's `immutable` HTTP cache in the same stroke. `'plain'` has no
 * version, on the premise that its output does not change — a premise the
 * end-of-game mark (added to both variants) already broke once: a plain GIF
 * stored before that change keeps serving without the mark.
 */
export const PLAYED_GIF_RENDER_VERSION = 3;

export type GameGifVariant = 'plain' | 'played';
