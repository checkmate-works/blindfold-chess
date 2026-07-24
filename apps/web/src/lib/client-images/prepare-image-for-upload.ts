/**
 * Client-side image normalization performed at file-selection time, before
 * an image is uploaded to any of the server image endpoints.
 *
 * @why iPhones shoot in HEIC/HEIF by default. None of the server upload
 *   endpoints (post images, avatars) accept HEIC — they allow only
 *   JPEG/PNG/WebP and reject everything else with a generic error, so an
 *   iPhone photo "fails to upload" with no explanation. On top of that the
 *   server caps each file at 2 MB *before* it downscales, and a HEIC photo
 *   transcoded to JPEG is frequently larger than 2 MB, so simply widening
 *   the allow-list would not be enough. This helper converts HEIC → JPEG and
 *   downscales/compresses oversized images in the browser so what reaches the
 *   server is always a web-ready file within limits. The server contract is
 *   unchanged — it still validates MIME, magic bytes and size authoritatively.
 *
 * @design
 * - **Detection is by magic bytes, never `file.type`.** iOS Safari commonly
 *   hands over a HEIC file with an empty `type`, so a MIME/extension branch
 *   would miss it. `sniffImageKind()` reads the leading bytes.
 * - **The HEIC decoder (libheif wasm, ~1 MB+) is `import()`-ed lazily and
 *   ONLY when a HEIC file is detected.** Normal JPEG/PNG/WebP uploads never
 *   pull it into the bundle graph — the initial-load cost is zero.
 * - **Work is conditional.** A JPEG/PNG/WebP already within limits is returned
 *   untouched (identity), so the existing happy path is byte-for-byte
 *   unchanged and carries no regression risk. Processing happens only for
 *   HEIC (always) or an oversized image (size > cap, or long edge > max).
 * - **Canvases stay small.** iOS Safari silently fails to read back a canvas
 *   above a hardware area limit, so we never allocate a full-resolution
 *   (48 MP) canvas — the destination canvas is capped at the downscale target
 *   (long edge ≤ `MAX_LONG_EDGE` ⇒ ≤ ~4 MP), well under the limit.
 */

export const MAX_LONG_EDGE = 2048;

/** Server rejects > 2 MB; aim comfortably under so re-encode jitter never trips it. */
export const TARGET_MAX_BYTES = 1_800_000;

/** JPEG/WebP quality steps tried in order until the encoded blob fits the target. */
const QUALITY_LADDER = [0.85, 0.72, 0.6, 0.5] as const;

export type SniffedImageKind = 'heic' | 'jpeg' | 'png' | 'webp' | 'other';

/**
 * Identify an image by its leading bytes. Pure and synchronous so it is unit
 * testable without a DOM. Only the container signatures we care about are
 * recognized; anything else is `'other'` and left for the server to judge.
 */
export function sniffImageKind(bytes: Uint8Array): SniffedImageKind {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }
  // HEIC/HEIF: ISO-BMFF `ftyp` box at bytes 4..8 with a HEIF-family brand.
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && // f
    bytes[5] === 0x74 && // t
    bytes[6] === 0x79 && // y
    bytes[7] === 0x70 // p
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (HEIF_BRANDS.has(brand)) return 'heic';
  }
  return 'other';
}

// Major brands emitted by iOS and other HEIF encoders.
const HEIF_BRANDS = new Set([
  'heic',
  'heix',
  'heim',
  'heis',
  'hevc',
  'hevx',
  'mif1',
  'msf1',
  'heif',
]);

/**
 * Decide whether an already-web-safe image (JPEG/PNG/WebP) needs to be
 * re-processed. Pure so the size/dimension policy is unit testable.
 * HEIC is handled separately (it must always be decoded) and is not passed
 * here.
 */
export function needsResize(sizeBytes: number, longestEdge: number): boolean {
  return sizeBytes > TARGET_MAX_BYTES || longestEdge > MAX_LONG_EDGE;
}

/** Scale factor (≤ 1) that brings the longest edge down to `MAX_LONG_EDGE`. */
export function computeScale(width: number, height: number): number {
  const longest = Math.max(width, height);
  return longest > MAX_LONG_EDGE ? MAX_LONG_EDGE / longest : 1;
}

/**
 * Thrown when a HEIC file was detected but could not be converted (unsupported
 * browser, corrupt file, wasm load failure). Callers surface a specific
 * "could not convert this image" message instead of the generic upload error.
 */
export class ImageConversionError extends Error {
  constructor(cause?: unknown) {
    super('Failed to convert image for upload');
    this.name = 'ImageConversionError';
    this.cause = cause;
  }
}

async function readLeadingBytes(file: File, count: number): Promise<Uint8Array> {
  const slice = file.slice(0, count);
  return new Uint8Array(await slice.arrayBuffer());
}

/** Swap a filename's extension so it matches the produced MIME type. */
function renameExtension(name: string, ext: string): string {
  const base = name.replace(/\.[^./\\]+$/, '');
  return `${base || 'image'}.${ext}`;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function createDrawSurface(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageConversionError('toBlob returned null'))),
      type,
      quality
    );
  });
}

/**
 * Draw a source bitmap onto a downscaled canvas and encode it, walking the
 * quality ladder (lossy formats only) until the result fits `TARGET_MAX_BYTES`.
 * PNG is lossless so `quality` is ignored and the best we can do is downscale.
 */
async function encodeFromBitmap(
  bitmap: ImageBitmap,
  outputMime: string,
  width: number,
  height: number
): Promise<Blob> {
  const scale = computeScale(width, height);
  const dw = Math.max(1, Math.round(width * scale));
  const dh = Math.max(1, Math.round(height * scale));
  const canvas = createDrawSurface(dw, dh);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageConversionError('2d context unavailable');
  ctx.drawImage(bitmap, 0, 0, dw, dh);

  if (outputMime === 'image/png') {
    return canvasToBlob(canvas, outputMime);
  }

  let last: Blob | null = null;
  for (const quality of QUALITY_LADDER) {
    const blob = await canvasToBlob(canvas, outputMime, quality);
    last = blob;
    if (blob.size <= TARGET_MAX_BYTES) return blob;
  }
  // Nothing hit the target; return the smallest attempt (last rung).
  return last as Blob;
}

/**
 * Normalize a user-selected image for upload.
 *
 * @returns the original `File` untouched when it is already a web-safe format
 *   within limits, or a new `File` (converted/downscaled) otherwise.
 * @throws {ImageConversionError} when a HEIC file cannot be decoded, or a
 *   resize step fails. Callers should catch this and show a format-specific
 *   error rather than attempting the upload.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  const header = await readLeadingBytes(file, 32);
  const kind = sniffImageKind(header);

  if (kind === 'heic') {
    return convertHeic(file);
  }

  // Web-safe formats: only touch oversized images. We still need dimensions
  // to know whether the long edge exceeds the cap, but avoid decoding at all
  // when the byte size alone is already within budget and typical.
  if (kind === 'jpeg' || kind === 'png' || kind === 'webp') {
    return maybeResizeWebSafe(file, kind);
  }

  // Unknown to us — let the server be the authority (unchanged behavior).
  return file;
}

async function convertHeic(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    const { heicTo } = await import('heic-to');
    bitmap = await heicTo({ blob: file, type: 'bitmap' });
  } catch (err) {
    throw new ImageConversionError(err);
  }
  try {
    const blob = await encodeFromBitmap(bitmap, 'image/jpeg', bitmap.width, bitmap.height);
    return new File([blob], renameExtension(file.name, 'jpg'), { type: 'image/jpeg' });
  } finally {
    bitmap.close();
  }
}

async function maybeResizeWebSafe(file: File, kind: 'jpeg' | 'png' | 'webp'): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Could not decode for measurement — hand the original to the server,
    // which will accept it if valid or reject it with its own validation.
    return file;
  }
  try {
    if (!needsResize(file.size, Math.max(bitmap.width, bitmap.height))) {
      return file;
    }
    const outputMime = `image/${kind === 'jpeg' ? 'jpeg' : kind}`;
    const blob = await encodeFromBitmap(bitmap, outputMime, bitmap.width, bitmap.height);
    const ext = MIME_TO_EXT[outputMime] ?? kind;
    return new File([blob], renameExtension(file.name, ext), { type: outputMime });
  } catch {
    // Resize failed on a file that is otherwise valid — better to attempt the
    // original upload than to block the user outright.
    return file;
  } finally {
    bitmap.close();
  }
}
