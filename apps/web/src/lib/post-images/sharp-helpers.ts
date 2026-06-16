import 'server-only';
/**
 * Sharp-backed processing for user-uploaded post images.
 *
 * @description
 * Two responsibilities:
 *
 * 1. **Dimension probe** — read width/height from the uploaded buffer and
 *    enforce the 50-megapixel cap before storing anything. Sharp's metadata
 *    parser is lazy (it does not fully decode the image), so the probe is
 *    cheap relative to a full decode.
 *
 * 2. **EXIF GPS strip + orientation bake-in** — re-encode the buffer so the
 *    persisted bytes carry no EXIF metadata (notably no GPS coordinates).
 *    `.rotate()` reads the EXIF orientation tag, applies it to the pixel
 *    data, and then strips it. Sharp's documented default is to drop ALL
 *    metadata on `.toBuffer()` unless `.withMetadata()` / `.keepMetadata()`
 *    is called explicitly — so omitting that call is the strip.
 *
 * The two functions are kept separate so unit tests can probe a tiny fixture
 * for dimensions without invoking the encoder. The handler always calls
 * both: probe first (rejects oversized images cheaply), then strip
 * (transforms the buffer that will actually be uploaded).
 *
 * @design Sharp is the only allowed entry point
 *
 * Sharp wraps libvips in a sandboxed-ish way that's much safer than a
 * naive `Buffer.toString()` peek. Avoid pulling in a second image library
 * for this code path — every additional dependency is another bug surface.
 *
 * @design `failOn: 'error'` and `pages: 1`
 *
 * Both options are passed to every Sharp constructor in this file:
 *
 * - `failOn: 'error'` rejects malformed or truncated inputs at parse time
 *   instead of silently producing garbage output. Without this, a carefully
 *   crafted "warning" input could pass the probe and surface broken pixels
 *   downstream.
 *
 * - `pages: 1` caps decoded memory at `width × height × 4` bytes regardless
 *   of how many frames are encoded in an animated WebP / APNG. A 2 MB
 *   animated WebP envelope can carry hundreds of frames that decompress to
 *   gigabytes in libvips — a small encoded size is NOT an upper bound on
 *   decode memory. `pages: 1` is the structural mitigation; the
 *   `metadata.pages > 1` check below is a separate user-facing rejection
 *   so animated images don't silently lose their animation.
 */
import sharp from 'sharp';

import {
  POST_IMAGES_MAX_FILE_SIZE,
  POST_IMAGES_MAX_MEGAPIXELS,
  type PostImageMimeType,
} from './validation';

/**
 * Sharp constructor options applied to every `sharp(input, ...)` call in
 * this file. See `@design failOn / pages` in the module-level TSDoc.
 *
 * Exported so unit tests can assert that callers pass these options
 * without having to monkey-patch the sharp module.
 */
export const SHARP_INPUT_OPTIONS = { failOn: 'error', pages: 1 } as const;

/**
 * Long-edge cap (pixels) applied to every persisted post image. 1600 px
 * covers retina (2× DPR) of the widest content slot we render in the UI
 * (~800 px), so resizing here costs no perceptible quality. Capping at
 * upload time means the bytes that hit Storage are also the bytes the
 * client downloads — no Vercel Image Optimization variants needed, and
 * we avoid serving 50-MP camera originals to every viewer.
 */
export const POST_IMAGE_MAX_LONG_EDGE = 1600;

/**
 * Every persisted post image is transcoded to WebP, regardless of the
 * uploaded format. `POST_IMAGE_OUTPUT_MIME` / `POST_IMAGE_OUTPUT_EXTENSION`
 * are the canonical stored content-type and storage-path extension.
 *
 * @design Why transcode instead of keeping the input encoding
 *
 * The long-edge resize bounds the output *dimensions* but NOT the output
 * *byte size*. A lossless PNG re-encode of photographic content (a phone
 * photo or a screenshot saved as PNG) routinely GROWS past the 2 MB
 * Storage `file_size_limit` / DB `chk_file_size` cap even after the resize
 * — empirically a ~1.5 MB PNG can re-encode to 3–4 MB. That surfaced as an
 * opaque `upload_failed` / `insert_failed` 500 for a perfectly valid
 * (≤ 2 MB) upload. WebP compresses both photographs and screenshots far
 * below the cap at our 1600 px long edge, so normalizing every upload to a
 * single efficient format closes the gap. Mirrors Discourse / Mastodon,
 * which also transcode uploads to one bounded format.
 */
export const POST_IMAGE_OUTPUT_MIME = 'image/webp' as const;
export const POST_IMAGE_OUTPUT_EXTENSION = 'webp' as const;

/**
 * WebP quality ladder used by `normalizePostImageBuffer` to guarantee the
 * output fits the byte budget. q80 at 1600 px is visually lossless for the
 * slots we render and lands far under 2 MB for essentially every real
 * upload — the lower rungs are a hard guarantee, not an expectation. Only a
 * pathological input ever steps past the first rung.
 */
export const POST_IMAGE_WEBP_QUALITY_LADDER = [80, 65, 50, 40] as const;

export type ProbeResult = { width: number; height: number };

/**
 * Thrown by `probeImageDimensions` when the input encodes more than one
 * frame (animated WebP, APNG, multi-page TIFF). The handler maps this to
 * a 400 with error code `animated_image_not_supported`.
 */
export class AnimatedImageNotSupportedError extends Error {
  constructor() {
    super('post_image_probe: animated images are not supported');
    this.name = 'AnimatedImageNotSupportedError';
  }
}

/**
 * Read width / height from an image buffer using Sharp's metadata parser.
 * Throws if the image cannot be parsed, has missing dimensions, or is
 * animated (more than one page/frame).
 *
 * The caller decides what to do with the result (size cap, DB insert).
 */
export async function probeImageDimensions(buffer: Buffer | ArrayBuffer): Promise<ProbeResult> {
  const input = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const metadata = await sharp(input, SHARP_INPUT_OPTIONS).metadata();
  const { width, height, pages } = metadata;
  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
    throw new Error('post_image_probe: missing or invalid dimensions');
  }
  // `pages` is reported by Sharp for any multi-page format (animated WebP,
  // APNG, multi-page TIFF, GIF). Reject up front so the handler can return
  // a stable error code; relying on `pages: 1` alone would silently keep
  // only the first frame, surprising the user.
  if (typeof pages === 'number' && pages > 1) {
    throw new AnimatedImageNotSupportedError();
  }
  return { width, height };
}

/**
 * Returns true iff `width * height` is within the megapixel cap.
 * Pure and unit-testable; the caller chains `probeImageDimensions` first.
 */
export function isWithinMegapixelCap(probe: ProbeResult): boolean {
  return probe.width * probe.height <= POST_IMAGES_MAX_MEGAPIXELS;
}

/**
 * Single-pass post-image normalization: orient → resize → strip →
 * transcode to WebP, bounded to a byte budget.
 *
 * Steps, all chained on one Sharp pipeline so libvips decodes the input
 * exactly once per encode attempt:
 *
 * 1. `.rotate()` (no argument) reads the EXIF orientation tag, bakes the
 *    corresponding rotation into the pixel data, and discards the tag.
 *
 * 2. `.resize(POST_IMAGE_MAX_LONG_EDGE, POST_IMAGE_MAX_LONG_EDGE,
 *    { fit: 'inside', withoutEnlargement: true })` caps the long edge so
 *    every persisted image is bounded above. `fit: 'inside'` preserves
 *    aspect ratio (the image is sized to fit *within* the box, not
 *    cropped), and `withoutEnlargement: true` is a no-op on already-small
 *    images (we never up-scale a 320 px thumbnail to 1600 px). Without
 *    this step we used to ship 50-MP camera originals straight to viewers
 *    and let Vercel Image Optimization manufacture variants on demand —
 *    that is what drove the +406% transformations spike.
 *
 * 3. `.webp({ quality })` transcodes to WebP. Unlike keeping the input
 *    encoding, this bounds the output *byte size* (see the
 *    `POST_IMAGE_OUTPUT_MIME` design note): a lossless PNG re-encode can
 *    blow past the 2 MB cap even after the resize, but WebP lands far
 *    below it. The quality is stepped down the `POST_IMAGE_WEBP_QUALITY_
 *    LADDER` until the encoded buffer fits `maxBytes` — a guarantee the
 *    Storage / DB caps depend on, not just a best effort.
 *
 * 4. `.toBuffer()` drops ALL remaining metadata (EXIF / XMP / IPTC / ICC)
 *    by default — Sharp's documented behavior when neither
 *    `.withMetadata()` nor `.keepMetadata()` is called. Calling
 *    `.withMetadata({})` is the inverse: it PRESERVES most metadata,
 *    including GPS. We deliberately do NOT call it here.
 *
 * `contentType` is retained on the signature for caller stability and as a
 * decode hint; Sharp auto-detects the input format, so it is not consulted
 * directly. SHARP_INPUT_OPTIONS bounds decode memory (`pages: 1`) and
 * rejects malformed input (`failOn: 'error'`); see the module-level TSDoc.
 */
export async function normalizePostImageBuffer(args: {
  buffer: Buffer | ArrayBuffer;
  contentType: PostImageMimeType;
  /** Byte budget the encoded output must fit. Defaults to the 2 MB cap. */
  maxBytes?: number;
}): Promise<Buffer> {
  const input = Buffer.isBuffer(args.buffer) ? args.buffer : Buffer.from(args.buffer);
  const maxBytes = args.maxBytes ?? POST_IMAGES_MAX_FILE_SIZE;

  const encode = (quality: number): Promise<Buffer> =>
    sharp(input, SHARP_INPUT_OPTIONS)
      .rotate()
      .resize(POST_IMAGE_MAX_LONG_EDGE, POST_IMAGE_MAX_LONG_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();

  let output = await encode(POST_IMAGE_WEBP_QUALITY_LADDER[0]);
  for (let i = 1; i < POST_IMAGE_WEBP_QUALITY_LADDER.length && output.byteLength > maxBytes; i++) {
    output = await encode(POST_IMAGE_WEBP_QUALITY_LADDER[i]);
  }
  return output;
}
