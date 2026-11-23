/**
 * Reads one value out of `supabase/config.toml` for the tests that check the
 * copies of its ports and URLs.
 *
 * A section-aware line scan instead of a parser: the tests need a handful of
 * scalar keys and one string array, and the repo has no TOML parser to depend
 * on. It understands exactly what those keys use — `key = value` directly
 * under a `[section]` header, `#` comments, and an array spread over several
 * lines — and nothing else (no inline tables, no `#` inside a string).
 */

/**
 * The raw text of `key` directly under `[section]` (not under
 * `[section.sub]`): `55321`, `"http://…"`, or a whole `[ … ]` array with its
 * lines joined by a space.
 */
export function readTomlValue(toml: string, section: string, key: string): string {
  let current: string | undefined;
  let collecting: string[] | undefined;
  for (const raw of toml.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (collecting) {
      collecting.push(line);
      if (line.endsWith(']')) return collecting.filter(Boolean).join(' ');
      continue;
    }
    const header = /^\[([^\]]+)\]$/.exec(line);
    if (header) {
      current = header[1];
      continue;
    }
    if (current !== section) continue;
    const entry = new RegExp(`^${key}\\s*=\\s*(.+)$`).exec(line);
    if (!entry) continue;
    const value = entry[1] ?? '';
    if (value.startsWith('[') && !value.endsWith(']')) {
      collecting = [value];
      continue;
    }
    return value;
  }
  throw new Error(
    `supabase/config.toml has no \`${key}\` under [${section}]. If it was moved or renamed, ` +
      'update the test that reads it and the copies that test checks.'
  );
}

/** `key` under `[section]` as an integer; throws when it is anything else. */
export function readTomlInteger(toml: string, section: string, key: string): number {
  const value = readTomlValue(toml, section, key);
  if (!/^\d+$/.test(value)) {
    throw new Error(
      `supabase/config.toml \`${key}\` under [${section}] is \`${value}\`, not an integer. If it ` +
        'was moved to an env() value, update the test that reads it and the copies it checks.'
    );
  }
  return Number(value);
}

/** `key` under `[section]` as the contents of a double-quoted string. */
export function readTomlString(toml: string, section: string, key: string): string {
  const value = readTomlValue(toml, section, key);
  const match = /^"(.*)"$/.exec(value);
  if (!match) {
    throw new Error(`supabase/config.toml \`${key}\` under [${section}] is not a string: ${value}`);
  }
  return match[1] ?? '';
}

/** `key` under `[section]` as an array of double-quoted strings. */
export function readTomlStringArray(toml: string, section: string, key: string): string[] {
  const value = readTomlValue(toml, section, key);
  if (!/^\[.*\]$/.test(value)) {
    throw new Error(`supabase/config.toml \`${key}\` under [${section}] is not an array: ${value}`);
  }
  return [...value.matchAll(/"([^"]*)"/g)].map((m) => m[1] ?? '');
}
