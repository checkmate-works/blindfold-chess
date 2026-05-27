/**
 * Normalize the self-declared `isSpoiler` checkbox from trusted FormData.
 *
 * A native checkbox submits `"on"` when checked; `"true"` is accepted too
 * for programmatic / fetch-based submissions. Anything else — including the
 * field being absent or a forged value — is `false`, so a missing or
 * tampered value never silently flags a post as containing the solution.
 */
export function readSpoilerFlag(formData: FormData): boolean {
  const raw = formData.get('isSpoiler');
  return raw === 'on' || raw === 'true';
}
