/**
 * Magic-byte verification for uploaded images — the single implementation
 * shared by every upload path (post images, avatars, admin article images,
 * admin ad creatives).
 *
 * @design Why one implementation
 *
 * There used to be two: `validatePostImageBinarySignature` here and a
 * `validateBinarySignature` under `@/lib/admin-images/validation`. They
 * drifted, and the admin copy was the weaker of the two — it accepted a PNG
 * on the first 4 bytes alone and a WebP on the `WEBP` marker alone, without
 * checking the leading `RIFF`. A byte sequence that the post path rejected as
 * a mislabelled file therefore sailed through the admin path.
 *
 * The check answers a question about image *formats*, not about who is
 * uploading, so it does not belong to either caller's module. Both size caps
 * and MIME allow-lists still differ per surface (post images cap at 2 MB,
 * admin images at 5 MB) — those are policy and stay with their callers. This
 * is the format fact, and there is exactly one of it.
 *
 * @design Why SVG is never accepted
 *
 * SVG can embed `<script>` and event handlers, and when served directly from
 * the `*.supabase.co` origin, navigating to the object URL executes them.
 * There is no SVG branch below and no MIME allow-list includes it, so an
 * `image/svg+xml` upload falls through to the final `return false`.
 */

/**
 * Whether `buffer`'s leading bytes match the format that `declaredType`
 * claims. Returns false for any MIME type without a branch here, so a
 * caller can pass an unvetted `file.type` safely.
 *
 * This catches MIME spoofing — a request that says `Content-Type:
 * image/jpeg` but carries a payload that does not start with `FF D8 FF`.
 * It is a cheap gate, not a decoder: callers still run the bytes through
 * Sharp, which is what actually rejects a malformed or hostile image.
 */
export function validateImageBinarySignature(buffer: ArrayBuffer, declaredType: string): boolean {
  const header = new Uint8Array(buffer.slice(0, 12));

  if (declaredType === 'image/jpeg') {
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (declaredType === 'image/png') {
    // The full 8-byte PNG signature. The trailing CR LF SUB LF bytes exist to
    // catch line-ending mangling, so checking only the first four would accept
    // a truncated or hand-crafted header.
    return (
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a
    );
  }
  if (declaredType === 'image/webp') {
    // WebP is a RIFF container: "RIFF" + 4 size bytes + "WEBP". Both markers
    // are required — the trailing one alone can appear inside unrelated data.
    return (
      header[0] === 0x52 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x46 &&
      header[8] === 0x57 &&
      header[9] === 0x45 &&
      header[10] === 0x42 &&
      header[11] === 0x50
    );
  }

  // SVG / image/svg+xml / anything unrecognized: reject.
  return false;
}
