/**
 * Constructor options for every `sharp(input, ...)` call in the app, and the
 * pixel budget behind them.
 *
 * Four upload paths — post images, article images, ad creatives, avatars — each
 * wrote `{ failOn: 'error', pages: 1, limitInputPixels: 50_000_000 }` out by
 * hand, and named the pixel cap three different ways: an inline literal, a
 * route-local `ARTICLE_IMAGE_MAX_INPUT_PIXELS`, and an import of the
 * post-images constant. Hardening options that only some callers pass are not
 * hardening.
 */

/**
 * Pixel budget (width x height) for anything libvips is asked to decode.
 *
 * This is the decompression-bomb defense: a highly compressible
 * huge-dimension image passes the byte-size cap and then decodes to gigabytes.
 * The number is deliberately the same one `post_images` enforces as a DB CHECK
 * — one policy for how large an image this app will ever decode, whether or
 * not the result is stored in that table.
 */
export const MAX_DECODE_PIXELS = 50_000_000;

/**
 * @design failOn / pages
 *
 * `failOn: 'error'` rejects malformed input up front instead of letting
 * libvips salvage a partial decode, so a truncated or crafted file fails as an
 * invalid upload rather than becoming a subtly corrupt stored image.
 *
 * `pages: 1` decodes only the first frame. Without it an animated WebP or GIF
 * costs frames x width x height of memory, which makes the pixel budget below
 * a per-frame budget rather than a total one.
 *
 * Exported rather than inlined so tests can assert a caller passes it without
 * monkey-patching the sharp module.
 */
export const SHARP_INPUT_OPTIONS = { failOn: 'error', pages: 1 } as const;

/**
 * {@link SHARP_INPUT_OPTIONS} plus the pixel budget, for callers that hand
 * their buffer straight to a decode (`.rotate()`, `.resize()`, `.toBuffer()`).
 *
 * The probe in `lib/post-images/sharp-helpers` deliberately uses the options
 * WITHOUT the budget: it reads metadata and then compares the dimensions
 * itself, so that an oversized image comes back as a specific validation error
 * instead of a thrown decode failure the route would report as a bad file type.
 */
export const SHARP_DECODE_OPTIONS = {
  ...SHARP_INPUT_OPTIONS,
  limitInputPixels: MAX_DECODE_PIXELS,
} as const;
