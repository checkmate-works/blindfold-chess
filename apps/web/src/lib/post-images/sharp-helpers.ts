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

import { POST_IMAGES_MAX_MEGAPIXELS, type PostImageMimeType } from './validation';

/**
 * Sharp constructor options applied to every `sharp(input, ...)` call in
 * this file. See `@design failOn / pages` in the module-level TSDoc.
 *
 * Exported so unit tests can assert that callers pass these options
 * without having to monkey-patch the sharp module.
 */
export const SHARP_INPUT_OPTIONS = { failOn: 'error', pages: 1 } as const;

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
 * EXIF strip + orientation bake-in.
 *
 * Sharp reads the EXIF orientation tag, applies the corresponding rotation
 * to the pixel data, and then drops ALL metadata (EXIF, XMP, IPTC, ICC) —
 * that strip behavior is Sharp's documented default for `.toBuffer()` when
 * neither `.withMetadata()` nor `.keepMetadata()` is called. Calling
 * `.withMetadata({})` is the inverse: it PRESERVES most metadata, including
 * GPS. We deliberately do NOT call it here. The output preserves the
 * original encoding (no format conversion).
 *
 * The output buffer is what we upload to Storage and record in the DB.
 */
export async function stripExifAndApplyOrientation(args: {
  buffer: Buffer | ArrayBuffer;
  contentType: PostImageMimeType;
}): Promise<Buffer> {
  const input = Buffer.isBuffer(args.buffer) ? args.buffer : Buffer.from(args.buffer);
  // .rotate() with no arg reads EXIF orientation and bakes it in, then
  // discards the orientation tag. Omitting .withMetadata() / .keepMetadata()
  // is what causes Sharp to strip ALL remaining metadata (incl. GPS) on
  // the way out — this is the documented default.
  // Output keeps the input format (sharp infers from the input by default
  // when no format() is called explicitly).
  // SHARP_INPUT_OPTIONS bounds decode memory (`pages: 1`) and rejects
  // malformed inputs (`failOn: 'error'`); see the module-level TSDoc.
  return sharp(input, SHARP_INPUT_OPTIONS).rotate().toBuffer();
}
