/** The prefix every generated username starts with. */
export const GENERATED_USERNAME_PREFIX = "player_";

/** How many random bytes the suffix is built from (two hex digits each). */
const SUFFIX_BYTES = 5;

/**
 * A username for the "generate a random username" button on the setup
 * screens: `player_` followed by ten hex digits, so it always passes
 * `validateUsername` (it starts with a letter, ends with a letter or digit,
 * has a single underscore and 17 characters). It is only a starting point the
 * user may keep or replace, and the server still checks that it is free.
 *
 * `randomBytes` is the platform's source of random bytes. The default is the
 * Web Crypto API, which browsers and Node have; React Native has no
 * `crypto.getRandomValues`, so the mobile app passes `expo-crypto`'s
 * `getRandomBytes`.
 */
export function generateUsername(
  randomBytes: (count: number) => Uint8Array = (count) =>
    crypto.getRandomValues(new Uint8Array(count)),
): string {
  const suffix = Array.from(randomBytes(SUFFIX_BYTES), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${GENERATED_USERNAME_PREFIX}${suffix}`;
}
