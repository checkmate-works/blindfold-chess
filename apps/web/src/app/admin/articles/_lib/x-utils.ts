/**
 * Extract a tweet ID from an X (formerly Twitter) URL.
 *
 * Supports:
 * - https://x.com/username/status/1234567890
 * - https://twitter.com/username/status/1234567890
 */
export function extractTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match?.[1] ?? null;
}

/**
 * Extract a username from an X (formerly Twitter) status URL.
 *
 * Supports:
 * - https://x.com/username/status/1234567890
 * - https://twitter.com/username/status/1234567890
 */
export function extractXUsername(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\//);
  return match?.[1] ?? null;
}
