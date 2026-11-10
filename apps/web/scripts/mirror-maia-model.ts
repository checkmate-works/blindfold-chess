import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Uploads the local Maia 3 model to the private `engine-models` Supabase
 * Storage bucket and prints a long-lived signed URL for it.
 *
 * The printed URL is what the Vercel env var `MAIA_MODEL_URL` holds, so that
 * `scripts/download-maia.ts` fetches the model from our own bucket at build
 * time instead of maiachess.com, which answers scripted requests with a
 * bot-protection challenge (HTTP 429).
 *
 * A signed URL keeps the bucket private: anyone holding it can download the
 * file, but nobody can list the bucket or guess the URL. It is therefore a
 * secret — store it as a `sensitive` env var and never commit or paste it.
 * A signed URL cannot be revoked on its own; to invalidate a leaked one,
 * re-upload under a different object path and re-sign.
 *
 * Usage (from apps/web, with the model already in engines/maia/):
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm exec tsx scripts/mirror-maia-model.ts
 * The full procedure, including where the key comes from, is in
 * docs/maia-model-mirror-runbook.md.
 */

const BUCKET = 'engine-models';
const LOCAL_PATH = join('engines', 'maia', 'maia3_simplified.onnx');
const OBJECT_PATH = 'maia/maia3_simplified.onnx';

/** SHA-256 of the upstream maia3_simplified.onnx this mirror is meant to hold. */
const EXPECTED_SHA256 = '405bf76c15727dad8728b352c06a8f3c1b80fb2760e8d666b32485c63d75b856';

/** Ten years. The URL only has to outlive the deploys that read it. */
const SIGNED_URL_TTL_SECONDS = 10 * 365 * 24 * 60 * 60;

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  }
  if (!existsSync(LOCAL_PATH)) {
    throw new Error(`${LOCAL_PATH} not found. Place the model there first.`);
  }

  const bytes = readFileSync(LOCAL_PATH);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== EXPECTED_SHA256) {
    throw new Error(`${LOCAL_PATH} has SHA-256 ${sha256}, expected ${EXPECTED_SHA256}.`);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(OBJECT_PATH, bytes, {
    contentType: 'application/octet-stream',
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(OBJECT_PATH, SIGNED_URL_TTL_SECONDS);
  if (signError) throw signError;

  // The download check proves the URL works without the service-role key.
  const head = await fetch(data.signedUrl, { headers: { Range: 'bytes=0-0' } });
  if (!head.ok) {
    throw new Error(`Signed URL check failed: ${head.status} ${head.statusText}`);
  }

  console.error(`Uploaded ${bytes.length} bytes to ${BUCKET}/${OBJECT_PATH}.`);
  console.log(data.signedUrl);
}

main().catch((error) => {
  console.error('Failed to mirror Maia model:', error);
  process.exit(1);
});
