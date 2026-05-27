import { readFile } from 'fs/promises';
import path from 'path';
import 'server-only';

/**
 * Disk directory holding the Maia ONNX model files. The path is
 * resolved against `process.cwd()` so it works both in local
 * development (`apps/web/engines/maia/`) and in the deployed
 * Vercel Function — provided that `outputFileTracingIncludes` in
 * `next.config.ts` bundles the `engines/maia` directory into the
 * function artifact.
 *
 * Intentionally NOT under `public/`: the file must not be served as a
 * static asset, otherwise the auth gate in the route handler is
 * trivially bypassable.
 */
const MAIA_MODEL_DIR = path.join(process.cwd(), 'engines', 'maia');

/**
 * Reads a Maia model file off disk and returns its bytes, or `null`
 * if the file is missing. The route handler converts a `null` here
 * into a 404 — the read error is swallowed deliberately so we don't
 * leak filesystem details to clients.
 */
export async function loadMaiaModel(file: string): Promise<Buffer | null> {
  const filePath = path.join(MAIA_MODEL_DIR, file);
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}
