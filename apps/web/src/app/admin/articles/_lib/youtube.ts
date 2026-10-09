import { parseYouTubeUrl } from '@/lib/games/youtube-validator';

/**
 * Validate a YouTube node's `src` and return it in canonical form, or
 * `null` if it is not an accepted YouTube URL.
 *
 * Delegates to `parseYouTubeUrl`, the same validator that gates post video
 * attachments, so articles accept exactly the URL shapes posts do: https
 * only, an exact host allow-list, and an 11-character id. The editor stores
 * the returned string, so every saved `src` re-parses cleanly at render time.
 */
export function normalizeYouTubeSrc(src: string): string | null {
  const result = parseYouTubeUrl(src.trim());
  return result.ok ? result.value.sourceUrl : null;
}

/**
 * Extract the video id from a YouTube node's `src`, or `null` if the URL is
 * rejected by `parseYouTubeUrl` (see `normalizeYouTubeSrc`). Renderers build
 * the iframe `src` from this id alone, never from the stored URL.
 */
export function extractYouTubeVideoId(src: string): string | null {
  const result = parseYouTubeUrl(src.trim());
  return result.ok ? result.value.providerVideoId : null;
}
