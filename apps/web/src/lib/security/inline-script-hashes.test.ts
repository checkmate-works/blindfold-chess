import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { AD_HIDE_BOOTSTRAP_SCRIPT } from '@/lib/ads/ad-hide-bootstrap-script';
import {
  AD_HIDE_BOOTSTRAP_HASH,
  ANNOUNCEMENT_DISMISS_HASH,
  THEME_BOOTSTRAP_HASH_DEV,
  THEME_BOOTSTRAP_HASH_PROD,
} from '@/lib/security/inline-script-hashes';
import {
  THEME_BOOTSTRAP_SCRIPT_DEV,
  THEME_BOOTSTRAP_SCRIPT_PROD,
} from '@/lib/theme/theme-bootstrap-script';

import { ANNOUNCEMENT_DISMISS_SCRIPT } from '@/app/[locale]/_components/announcement-dismiss-script';

/**
 * The CSP hash constants are handwritten literals (the Edge middleware cannot
 * hash synchronously at runtime), so this test is what keeps them honest:
 * each digest is recomputed from the actual script source. If a bootstrap
 * script changes, this fails until the matching constant in
 * `inline-script-hashes.ts` is updated — the alternative is silent CSP
 * violations on every page view in production.
 */
function cspSha256(script: string): string {
  return `sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}`;
}

describe('inline script CSP hashes', () => {
  it.each([
    ['theme bootstrap (prod)', THEME_BOOTSTRAP_SCRIPT_PROD, THEME_BOOTSTRAP_HASH_PROD],
    ['theme bootstrap (dev)', THEME_BOOTSTRAP_SCRIPT_DEV, THEME_BOOTSTRAP_HASH_DEV],
    ['ad-hide bootstrap', AD_HIDE_BOOTSTRAP_SCRIPT, AD_HIDE_BOOTSTRAP_HASH],
    ['announcement dismiss', ANNOUNCEMENT_DISMISS_SCRIPT, ANNOUNCEMENT_DISMISS_HASH],
  ])('%s hash matches its script source', (_name, script, hash) => {
    expect(hash).toBe(cspSha256(script));
  });
});
