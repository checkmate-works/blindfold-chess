/**
 * Inline glossary-term markup for authored prose.
 *
 * Guide body text (next-intl JSON strings) may embed a term reference with
 * the token `[[slug|label]]` — or `[[slug]]` when the surface text is the
 * slug itself. At render time the guide renderer parses each string into a
 * sequence of plain-text and term tokens; term tokens become clickable
 * `TermLink`s that open the glossary preview modal.
 *
 * The token is deliberately explicit (authored, not auto-detected): common
 * chess words ("position", "opening", "fork") collide with term names, and
 * Japanese prose has no word boundaries, so an auto-linker would over-match.
 * Explicit markup lets the author link the right word, once, in the right
 * place.
 *
 * Grammar (single line, no nesting):
 *   token   := "[[" slug ("|" label)? "]]"
 *   slug    := one or more chars that are not "[", "]", or "|"
 *   label   := one or more chars that are not "[" or "]"
 *
 * Both `slug` and `label` are trimmed. A `[[...]]` that does not match the
 * grammar (e.g. empty slug, stray brackets) is left verbatim as text, so
 * malformed markup degrades to literal characters rather than disappearing.
 */

export type TermMarkupToken =
  { type: 'text'; value: string } | { type: 'term'; slug: string; label: string };

// Global, non-nesting. `slug` excludes | ] [ ; `label` excludes ] [.
const TERM_MARKUP_RE = /\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g;

/**
 * Split `input` into an ordered list of text / term tokens.
 *
 * Adjacent text is coalesced; the result never contains two consecutive
 * `text` tokens and never contains an empty `text` token. A string with no
 * markup yields a single `text` token (or an empty array for an empty
 * string).
 */
export function parseTermMarkup(input: string): TermMarkupToken[] {
  const tokens: TermMarkupToken[] = [];
  let lastIndex = 0;

  // Fresh lastIndex per call — the regex is module-level and stateful.
  TERM_MARKUP_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TERM_MARKUP_RE.exec(input)) !== null) {
    const slug = match[1].trim();
    const label = (match[2] ?? match[1]).trim();

    // Defensive: the regex requires ≥1 non-bracket char, but trimming a
    // whitespace-only capture could still empty it. Treat as literal text.
    if (slug === '' || label === '') {
      continue;
    }

    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: input.slice(lastIndex, match.index) });
    }
    tokens.push({ type: 'term', slug, label });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    tokens.push({ type: 'text', value: input.slice(lastIndex) });
  }

  return tokens;
}

/**
 * Collect the distinct term slugs referenced in `input`, in first-seen
 * order. Used to build the modal's preview map from only the terms a page
 * actually links.
 */
export function collectTermSlugs(input: string): string[] {
  const seen = new Set<string>();
  for (const token of parseTermMarkup(input)) {
    if (token.type === 'term') seen.add(token.slug);
  }
  return [...seen];
}
