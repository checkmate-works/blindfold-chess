import {
  POST_IMAGES_MAX_MEGAPIXELS,
  type PostImageMimeType,
} from '@/app/api/posts/[id]/images/post-image-validation';
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
 *    data, and then strips it; `.withMetadata({})` ensures no EXIF chunk
 *    is re-written into the output.
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
 */
import sharp from 'sharp';

export type ProbeResult = { width: number; height: number };

/**
 * Read width / height from an image buffer using Sharp's metadata parser.
 * Throws if the image cannot be parsed or has missing dimensions.
 *
 * The caller decides what to do with the result (size cap, DB insert).
 */
export async function probeImageDimensions(buffer: Buffer | ArrayBuffer): Promise<ProbeResult> {
  const input = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const metadata = await sharp(input).metadata();
  const { width, height } = metadata;
  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
    throw new Error('post_image_probe: missing or invalid dimensions');
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
 * to the pixel data, and then drops EXIF entirely (because we pass an
 * empty `withMetadata({})`). The output preserves the original encoding
 * (no format conversion).
 *
 * The output buffer is what we upload to Storage and record in the DB.
 */
export async function stripExifAndApplyOrientation(args: {
  buffer: Buffer | ArrayBuffer;
  contentType: PostImageMimeType;
}): Promise<Buffer> {
  const input = Buffer.isBuffer(args.buffer) ? args.buffer : Buffer.from(args.buffer);
  // .rotate() with no arg reads EXIF orientation and bakes it in.
  // .withMetadata({}) writes an empty metadata block — no EXIF passes through.
  // Output keeps the input format (sharp infers from the input by default
  // when no format() is called explicitly).
  return sharp(input).rotate().withMetadata({}).toBuffer();
}
