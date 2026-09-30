import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Both root layouts that mount the consent banner must also mount
 * `ConsentAttributeSync`, and mount it ahead of `GoogleScripts`. The order is
 * load-bearing: sibling effects run in tree order, and the analytics gate
 * reads `<html data-consent>` in its own mount effect, so the sync has to
 * have put the attribute back first. The embed layout is deliberately absent
 * — it mounts neither the banner nor analytics.
 */
const ROOT_LAYOUTS = [
  { name: '[locale]/layout.tsx', path: resolve(__dirname, '[locale]/layout.tsx') },
  { name: '(landing)/layout.tsx', path: resolve(__dirname, '(landing)/layout.tsx') },
] as const;

const IMPORT_RE =
  /import\s*\{\s*ConsentAttributeSync\s*\}\s*from\s*['"]@\/lib\/consent\/ConsentAttributeSync['"]/;

describe.each(ROOT_LAYOUTS)('$name', ({ path }) => {
  const source = readFileSync(path, 'utf8');

  it('imports and mounts ConsentAttributeSync', () => {
    expect(source).toMatch(IMPORT_RE);
    expect(source).toMatch(/<ConsentAttributeSync\s*\/>/);
  });

  it('mounts it ahead of GoogleScripts', () => {
    const sync = source.search(/<ConsentAttributeSync\s*\/>/);
    const analytics = source.search(/<GoogleScripts\b/);
    expect(sync).toBeGreaterThan(-1);
    expect(analytics).toBeGreaterThan(-1);
    expect(sync).toBeLessThan(analytics);
  });
});
