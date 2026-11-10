# Maia Model Mirror Runbook

Every build runs `scripts/download-maia.ts` during `prebuild` and fetches the
Maia 3 model (`maia3_simplified.onnx`, ~46 MB) from the URL in the
`MAIA_MODEL_URL` env var. Production and Preview builds point that variable at
our own copy in Supabase Storage. Without it the script falls back to
`https://www.maiachess.com/maia3/maia3_simplified.onnx`, and that host answers
scripted requests with a Vercel bot-protection challenge (HTTP 429 with
`x-vercel-mitigated: challenge`), which fails the build with
`Failed to fetch Maia model: 429 Too Many Requests`.

Run this procedure when:

- the mirror has to be set up from scratch (a new Supabase project),
- the signed URL leaked, or expires (it is signed for ten years), or
- a new model version ships (see "New model version" below).

## How the mirror is built

| Piece              | Value                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Bucket             | `engine-models`, **private**, 50 MB file limit. Declared in `drizzle/supabase/storage_setup.sql`, so every build's migration step converges it. |
| Object             | `maia/maia3_simplified.onnx`                                                                                                                    |
| Vercel env var     | `MAIA_MODEL_URL`, type **sensitive**, targets Production and Preview                                                                            |
| Upload and signing | `scripts/mirror-maia-model.ts` (checks the SHA-256, uploads, signs, and test-fetches the signed URL)                                            |

The bucket is private for the same reason `/api/engines/maia/[file]` is
auth-gated: an anonymous caller must not be able to trigger 46 MB of egress.
Only the signed URL can download the object, so treat it as a secret — it lives
only in Vercel's sensitive env var. Never commit it, paste it into an issue, or
log it.

Preview builds also use the production bucket. Supabase Branching gives a
Preview its own database and keys, but that branch's Storage has no model in
it, and the signed URL needs no key.

## Procedure

Everything below runs from `apps/web` on a machine that has the correct model
in `engines/maia/maia3_simplified.onnx`. The script refuses a file whose
SHA-256 differs from the one pinned in it.

1. Log the Supabase CLI in. This opens a browser, so it has to be done by a
   person, once per machine:

   ```bash
   npx supabase login
   ```

2. Upload the model and print a new signed URL. The service-role key is read
   through the CLI and passed straight to the script, so it never appears on
   screen or in shell history. Replace `<project-ref>` with the production
   project's ref (the subdomain of its `*.supabase.co` URL):

   ```bash
   REF=<project-ref>
   NEXT_PUBLIC_SUPABASE_URL="https://$REF.supabase.co" \
   SUPABASE_SERVICE_ROLE_KEY="$(npx supabase projects api-keys --project-ref "$REF" -o json | jq -r '.[] | select(.name == "service_role") | .api_key')" \
   pnpm exec tsx scripts/mirror-maia-model.ts > /tmp/maia-url
   ```

   The script prints the URL on stdout (captured in the file) and progress on
   stderr. It fails without writing a URL if the upload, the signing, or the
   test fetch fails.

3. Store the URL in Vercel as a sensitive variable for Production and Preview
   (`vercel env add` asks whether the value is sensitive — answer yes), then
   delete the local copy:

   ```bash
   vercel env rm MAIA_MODEL_URL production --yes; vercel env rm MAIA_MODEL_URL preview --yes
   vercel env add MAIA_MODEL_URL production < /tmp/maia-url
   vercel env add MAIA_MODEL_URL preview < /tmp/maia-url
   rm /tmp/maia-url
   ```

4. Redeploy production (env var changes apply only to new builds), and check
   that the build log shows
   `Downloading Maia 3 model from https://<project-ref>.supabase.co/storage/...`
   followed by `Downloaded Maia model to engines/maia/maia3_simplified.onnx (45.7 MB).`

## Revoking a leaked URL

A signed URL cannot be revoked on its own. Delete the object (or change
`OBJECT_PATH` in `scripts/mirror-maia-model.ts`), then run the procedure again.
Every URL signed for the old object stops working once the object is gone.

## New model version

A new version needs a new filename everywhere — the rule and the list of places
to change are on `ALLOWED_FILES` in `src/app/api/engines/maia/[file]/route.ts`.
For the mirror, also update `LOCAL_PATH`, `OBJECT_PATH` and `EXPECTED_SHA256` in
`scripts/mirror-maia-model.ts`, then run the procedure.
