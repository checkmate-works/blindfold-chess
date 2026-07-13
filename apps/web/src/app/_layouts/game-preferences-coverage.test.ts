import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PUBLIC_ROOT = resolve(__dirname, '../[locale]/(public)');
const RE_EXPORT_TOKEN = "from '@/app/_layouts/game-preferences-layout'";
const PROVIDER_TOKEN = 'GamePreferencesProvider';
const HOOK_TOKEN = 'useGamePreferences';

/**
 * Components that call `useGamePreferences` *indirectly* — they render a board
 * (or a modal containing one) without naming the hook themselves, so a file
 * that only imports one of these still needs the provider overhead. Rendering
 * `MoveReferencePreviewModal` from the repertoire line page threw
 * "must be used within a GamePreferencesProvider" for exactly this reason; the
 * HOOK_TOKEN scan alone cannot see it.
 */
const INDIRECT_CONSUMER_TOKENS = [
  'MoveReferencePreviewModal',
  'GameCommentBody',
  'CommentMoveBody',
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function hasAncestorWithProvider(filePath: string): boolean {
  let cur = dirname(filePath);
  while (cur.startsWith(PUBLIC_ROOT) || cur === PUBLIC_ROOT) {
    const layout = join(cur, 'layout.tsx');
    try {
      const src = readFileSync(layout, 'utf8');
      if (src.includes(RE_EXPORT_TOKEN) || src.includes(PROVIDER_TOKEN)) return true;
    } catch {
      // no layout.tsx in this dir; keep walking up
    }
    if (cur === PUBLIC_ROOT) break;
    cur = dirname(cur);
  }
  return false;
}

describe('GamePreferencesProvider coverage under (public)', () => {
  it('chunks/layout.tsx re-exports GamePreferencesLayout (regression for chunks bug)', () => {
    const layout = join(PUBLIC_ROOT, 'chunks', 'layout.tsx');
    expect(readFileSync(layout, 'utf8')).toContain(RE_EXPORT_TOKEN);
  });

  it('every consumer of useGamePreferences has an ancestor layout that mounts the provider', () => {
    const consumers = walk(PUBLIC_ROOT)
      .filter((p) => /\.(tsx|ts)$/.test(p))
      .filter((p) => !/\.test\.(tsx|ts)$/.test(p))
      .filter((p) => readFileSync(p, 'utf8').includes(HOOK_TOKEN));

    expect(consumers.length).toBeGreaterThan(0);

    const missing = consumers
      .filter((p) => !hasAncestorWithProvider(p))
      .map((p) => relative(PUBLIC_ROOT, p));

    expect(missing).toEqual([]);
  });

  it('every renderer of a board-preview component has an ancestor layout that mounts the provider', () => {
    const consumers = walk(PUBLIC_ROOT)
      .filter((p) => /\.tsx$/.test(p))
      .filter((p) => !/\.test\.tsx$/.test(p))
      .filter((p) => {
        const src = readFileSync(p, 'utf8');
        // Only the importing file matters — the component's own directory may
        // sit under a provider while the importer's does not.
        return INDIRECT_CONSUMER_TOKENS.some((token) => src.includes(`import { ${token} }`));
      });

    expect(consumers.length).toBeGreaterThan(0);

    const missing = consumers
      .filter((p) => !hasAncestorWithProvider(p))
      .map((p) => relative(PUBLIC_ROOT, p));

    expect(missing).toEqual([]);
  });
});
