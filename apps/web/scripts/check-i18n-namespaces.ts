/**
 * Guard: ensure every top-level namespace in `src/messages/<locale>.json` is
 * explicitly classified in `src/app/[locale]/_lib/i18n-namespaces.ts` as
 * either 'server' or 'client'.
 *
 * Historical behavior: `layout.tsx` used a hand-maintained deny list of
 * server-only namespaces, and any new namespace was silently included in the
 * client-side dictionary payload. This script flips the default: adding a new
 * namespace without classifying it causes `pnpm check:i18n` (and CI) to fail.
 *
 * Usage:
 *   pnpm --filter web check:i18n
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NAMESPACE_CLASSIFICATION } from '../src/app/[locale]/_lib/i18n-namespaces';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(HERE, '..');
const MESSAGES_DIR = join(WEB_ROOT, 'src', 'messages');

function loadLocaleNamespaces(): { locale: string; namespaces: Set<string> }[] {
  const entries = readdirSync(MESSAGES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  return entries.map((file) => {
    const locale = file.replace(/\.json$/, '');
    const raw = readFileSync(join(MESSAGES_DIR, file), 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return { locale, namespaces: new Set(Object.keys(parsed)) };
  });
}

function main(): void {
  const locales = loadLocaleNamespaces();
  if (locales.length === 0) {
    console.error(`[check:i18n] No locale files found in ${MESSAGES_DIR}`);
    process.exit(1);
  }

  // Union of namespaces across all locale files.
  const unionNamespaces = new Set<string>();
  for (const { namespaces } of locales) {
    for (const n of namespaces) unionNamespaces.add(n);
  }

  // Cross-check: each locale file must agree on the namespace set.
  const [first, ...rest] = locales;
  const mismatches: string[] = [];
  for (const other of rest) {
    const missingInOther = [...first.namespaces].filter((n) => !other.namespaces.has(n));
    const extraInOther = [...other.namespaces].filter((n) => !first.namespaces.has(n));
    if (missingInOther.length > 0) {
      mismatches.push(
        `  ${other.locale}.json is missing namespaces present in ${first.locale}.json: ${missingInOther.join(', ')}`
      );
    }
    if (extraInOther.length > 0) {
      mismatches.push(
        `  ${other.locale}.json has extra namespaces not in ${first.locale}.json: ${extraInOther.join(', ')}`
      );
    }
  }

  const classifiedNames = new Set(Object.keys(NAMESPACE_CLASSIFICATION));

  const unclassified = [...unionNamespaces].filter((n) => !classifiedNames.has(n)).sort();
  const stale = [...classifiedNames].filter((n) => !unionNamespaces.has(n)).sort();

  const errors: string[] = [];

  if (unclassified.length > 0) {
    errors.push(
      `Unclassified i18n namespaces (present in messages JSON but missing from NAMESPACE_CLASSIFICATION):\n` +
        unclassified.map((n) => `  - ${n}`).join('\n') +
        `\n\nFix: add each entry to \`src/app/[locale]/_lib/i18n-namespaces.ts\` with either 'server' (used only by Server Components via getTranslations()) or 'client' (needed by useTranslations() in Client Components).`
    );
  }

  if (stale.length > 0) {
    errors.push(
      `Stale i18n namespaces (classified in NAMESPACE_CLASSIFICATION but not present in any messages JSON):\n` +
        stale.map((n) => `  - ${n}`).join('\n') +
        `\n\nFix: remove these entries from \`src/app/[locale]/_lib/i18n-namespaces.ts\`.`
    );
  }

  if (mismatches.length > 0) {
    errors.push(`Locale files disagree on namespace set:\n${mismatches.join('\n')}`);
  }

  if (errors.length > 0) {
    console.error('[check:i18n] FAIL\n');
    for (const err of errors) {
      console.error(err);
      console.error('');
    }
    process.exit(1);
  }

  const serverCount = Object.values(NAMESPACE_CLASSIFICATION).filter((v) => v === 'server').length;
  const clientCount = Object.values(NAMESPACE_CLASSIFICATION).filter((v) => v === 'client').length;
  console.log(
    `[check:i18n] OK — ${unionNamespaces.size} namespaces across ${locales.length} locale(s): ${serverCount} server-only, ${clientCount} client-allowed.`
  );
}

main();
