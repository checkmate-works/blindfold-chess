import { headers } from 'next/headers';

/**
 * Resolve the current request's CSP nonce from the `x-nonce` request header
 * set by `src/proxy.ts`.
 *
 * Only importable from Server Components (or other server-only modules) --
 * statically imports `next/headers`, which Next.js forbids in Client
 * Components and Pages Router paths. The function is split into its own
 * module (rather than added to `@/lib/security/csp`) so modules shared with
 * the edge proxy and non-server-component code continue to avoid any
 * `next/headers` dependency.
 *
 * Returns `undefined` when `x-nonce` is not present (e.g. during static
 * generation paths that bypass the proxy). Callers forward the result to
 * `<JsonLd nonce={...} />` and similar components so the emitted inline
 * `<script>` carries the per-request nonce required by the enforcing
 * `strict-dynamic` CSP.
 */
export async function resolveCspNonce(): Promise<string | undefined> {
  return (await headers()).get('x-nonce') ?? undefined;
}
