import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PUBLIC_ROOT = resolve(__dirname, '../[locale]/(public)');
const RE_EXPORT_TOKEN = "from '@/app/_layouts/game-preferences-layout'";
const PROVIDER_TOKEN = 'GamePreferencesProvider';
const HOOK_TOKEN = 'useGamePreferences';

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
});
