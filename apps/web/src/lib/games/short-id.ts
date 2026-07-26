import { UUID_RE } from '@/lib/validations/uuid';

/**
 * Short, URL-safe rendering of a game UUID, used by the `/g/<code>` share
 * link.
 *
 * The code is the UUID's own 16 bytes in unpadded base64url — a pure,
 * reversible encoding, NOT a lookup key. That is the whole point: no
 * `short_code` column, no backfill of existing rows, no collision retry, and
 * no second identifier to keep in sync. `decode(encode(id)) === id` holds for
 * every UUID, so a code resolves through the same `getGameById` query the
 * canonical URL uses.
 *
 * Length: 36 chars → 22, which takes the shared link from 87 to 59 characters.
 * A dedicated 8-char code column would reach 45, but only by paying the
 * migration/backfill/collision cost above; revisit if the extra 14 characters
 * ever justify it.
 *
 * The short URL is a 301 to the canonical `/{locale}/games/shared/{id}` page,
 * which stays the indexed one — this encoding never appears in `canonical`,
 * the sitemap, or `hreflang`.
 *
 * Encoding uses `btoa`/`atob` rather than `Buffer` so the same module works in
 * the browser (the share menu builds the link client-side) and on the server
 * (the redirect route decodes it).
 */

/** Unpadded base64url of 16 bytes is always 22 chars. */
const SHORT_ID_RE = /^[A-Za-z0-9_-]{22}$/;

/** `019f8e93-32ad-750e-894e-267acf1575e2` → `AZ-OkzKtdQ6JTiZ6zxV14g`. */
export function encodeGameShortId(uuid: string): string {
  const hex = uuid.replaceAll('-', '');
  let binary = '';
  for (let i = 0; i < hex.length; i += 2) {
    binary += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/**
 * Inverse of {@link encodeGameShortId}. Returns `null` for anything that is
 * not a well-formed code, so a mistyped or truncated link 404s without a DB
 * round-trip.
 */
export function decodeGameShortId(code: string): string | null {
  if (!SHORT_ID_RE.test(code)) return null;

  // 22 chars → one '==' pad to reach a 24-char (3-byte-aligned) block.
  const base64 = `${code.replaceAll('-', '+').replaceAll('_', '/')}==`;
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    return null;
  }
  if (binary.length !== 16) return null;

  let hex = '';
  for (let i = 0; i < binary.length; i += 1) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, '0');
  }

  const uuid = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');

  // Belt and braces: every 16-byte decode already produces a shape `UUID_RE`
  // accepts, so this only matters if that pattern is ever tightened.
  return UUID_RE.test(uuid) ? uuid : null;
}
