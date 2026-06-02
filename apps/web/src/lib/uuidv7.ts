import { randomBytes } from 'node:crypto';

/**
 * UUIDv7 generator (RFC 9562).
 *
 * Layout: 48-bit Unix-ms timestamp ‖ version (7) ‖ 12 random bits ‖ variant
 * (0b10) ‖ 62 random bits. The leading timestamp makes ids time-ordered (so
 * they sort chronologically and support index-only keyset pagination), while
 * the 74 random bits keep them globally unique and unguessable.
 *
 * Used as the primary key / public URL identifier for shared `games` (and
 * `game_comments`), generated app-side via Drizzle `$defaultFn`. Server-only
 * (`node:crypto`); not for client bundles.
 *
 * @param now Unix epoch milliseconds for the timestamp prefix. Defaults to
 *   `Date.now()`; injectable for deterministic tests.
 */
export function uuidv7(now: number = Date.now()): string {
  const bytes = randomBytes(16);

  // 48-bit big-endian timestamp into bytes[0..5].
  bytes[0] = Math.floor(now / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(now / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(now / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(now / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;

  // Version 7 in the high nibble of byte 6; RFC variant 0b10 in byte 8.
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
