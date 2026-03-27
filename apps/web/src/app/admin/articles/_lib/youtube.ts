/**
 * Extract a YouTube video ID from various URL formats.
 *
 * Supported formats:
 * - Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
 * - Embed URL: https://www.youtube.com/embed/VIDEO_ID
 * - Privacy-enhanced embed: https://www.youtube-nocookie.com/embed/VIDEO_ID
 * - Short URL: https://youtu.be/VIDEO_ID
 * - Shorts URL: https://www.youtube.com/shorts/VIDEO_ID
 */
export function extractYouTubeVideoId(src: string): string | null {
  // Guard: only process YouTube domains
  const isYouTubeUrl = /(?:youtube\.com|youtube-nocookie\.com|youtu\.be)/.test(src);
  if (!isYouTubeUrl) return null;

  // Try regex-based extraction first (handles all common formats)
  const regexMatch = src.match(/(?:v=|shorts\/|youtu\.be\/|embed\/)([-\w]+)/);
  if (regexMatch?.[1]) {
    return regexMatch[1];
  }

  // Fallback: try URL-based parsing for edge cases
  try {
    const url = new URL(src);

    // Standard ?v= query parameter
    const vParam = url.searchParams.get('v');
    if (vParam) return vParam;

    // youtu.be short links
    if (url.hostname === 'youtu.be') {
      const pathId = url.pathname.slice(1);
      if (pathId) return pathId;
    }
  } catch {
    // Not a valid URL - no video ID found
  }

  return null;
}
