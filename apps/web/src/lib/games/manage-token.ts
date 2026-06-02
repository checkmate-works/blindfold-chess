import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import 'server-only';

/**
 * Manage-token: the capability secret that lets an account-less author control
 * (unpublish / delete / claim) a shared game without an account.
 *
 * Flow: at publish time for an anonymous author we mint a random token, store
 * only its SHA-256 hash in `game_tokens`, and hand the raw token back to the
 * client to keep in localStorage next to the game. Later management requests
 * present the raw token; the server hashes it and compares against the stored
 * hash in constant time. The raw token is never persisted server-side, so a DB
 * leak does not expose control of any game.
 *
 * Server-only (`node:crypto`).
 */

/** 32 bytes of entropy → 43-char base64url secret. */
const TOKEN_BYTES = 32;

export function hashManageToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Mint a fresh token and its storable hash. */
export function generateManageToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  return { token, tokenHash: hashManageToken(token) };
}

/**
 * Constant-time check that a presented raw token hashes to the stored hash.
 * Returns false on any length/format mismatch rather than throwing.
 */
export function manageTokenMatches(token: string, storedHash: string): boolean {
  const actual = Buffer.from(hashManageToken(token), 'hex');
  let expected: Buffer;
  try {
    expected = Buffer.from(storedHash, 'hex');
  } catch {
    return false;
  }
  if (actual.length !== expected.length || expected.length === 0) return false;
  return timingSafeEqual(actual, expected);
}
