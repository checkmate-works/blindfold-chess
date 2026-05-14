import { existsSync, mkdirSync, statSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Downloads the Maia 3 "simplified" ONNX model to `apps/web/public/engines/maia/`.
 *
 * The model itself (~46 MB) is not committed to git — it lives in the
 * gitignored public engine directory and is fetched on demand by this
 * script. The `prebuild` hook in package.json invokes this so production
 * deploys always have it; developers run `pnpm download-maia` once to
 * pull it into their local dev tree.
 *
 * Upstream: CSSLab/maia-platform-frontend hosts the file on their own
 * Vercel deployment at maiachess.com. This is the canonical distribution
 * point — there is no `maia-chess` GitHub release for the simplified
 * Maia 3 model as of this writing. If maiachess.com becomes unreliable,
 * mirror the file to our own Cloudflare R2 / B2 bucket and switch the
 * URL here.
 *
 * The model is GPL-3.0 licensed (a derivative work of the Maia Chess
 * project's training pipeline). Attribution and source-code pointers
 * are listed on the /licenses page; nothing else is required for plain
 * redistribution of the unmodified binary.
 */

const MAIA_MODEL_URL =
  process.env.MAIA_MODEL_URL ?? 'https://www.maiachess.com/maia3/maia3_simplified.onnx';

// NOT under public/: the file must be readable by the auth-gated
// route handler (/api/engines/maia/[file]) but unreachable as a static
// asset. next.config.ts's `outputFileTracingIncludes` bundles this
// directory into the deployed Vercel Function artifact.
const TARGET_DIR = join('engines', 'maia');
const TARGET_FILENAME = 'maia3_simplified.onnx';
const TARGET_PATH = join(TARGET_DIR, TARGET_FILENAME);

/**
 * Minimum acceptable file size (in bytes) — guards against partial /
 * truncated downloads being treated as success. The real file is
 * ~45.7 MB; we accept anything ≥ 40 MB to leave headroom for future
 * minor changes.
 */
const MIN_EXPECTED_SIZE_BYTES = 40 * 1024 * 1024;

async function downloadMaiaModel(): Promise<void> {
  if (existsSync(TARGET_PATH)) {
    const stats = statSync(TARGET_PATH);
    if (stats.size >= MIN_EXPECTED_SIZE_BYTES) {
      console.log(
        `Maia model already present at ${TARGET_PATH} (${formatMb(stats.size)}); skipping download.`
      );
      return;
    }
    console.log(
      `Maia model at ${TARGET_PATH} looks truncated (${formatMb(stats.size)} < ${formatMb(
        MIN_EXPECTED_SIZE_BYTES
      )}); re-downloading.`
    );
  }

  mkdirSync(TARGET_DIR, { recursive: true });

  console.log(`Downloading Maia 3 model from ${MAIA_MODEL_URL} ...`);
  const response = await fetch(MAIA_MODEL_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Maia model: ${response.status} ${response.statusText}`);
  }

  // The model is ~46 MB — well within Node's heap. Buffering once is
  // simpler than bridging a Web ReadableStream into a Node write stream,
  // and a one-off install script does not benefit from streaming I/O.
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(TARGET_PATH, buffer);

  const stats = statSync(TARGET_PATH);
  if (stats.size < MIN_EXPECTED_SIZE_BYTES) {
    throw new Error(
      `Downloaded Maia model is too small (${formatMb(stats.size)} < ${formatMb(
        MIN_EXPECTED_SIZE_BYTES
      )}); aborting to avoid shipping a truncated file.`
    );
  }
  console.log(`Downloaded Maia model to ${TARGET_PATH} (${formatMb(stats.size)}).`);
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

downloadMaiaModel().catch((error) => {
  console.error('Failed to download Maia model:', error);
  process.exit(1);
});
