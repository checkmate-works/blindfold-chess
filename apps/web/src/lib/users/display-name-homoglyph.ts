import { IMPERSONATION_SENSITIVE_NAMES } from '@blindfold-chess/features/username';

/**
 * Homoglyph checks for `profiles.display_name`.
 *
 * A username is restricted to lowercase ASCII, so a reserved username cannot
 * be spelled with look-alike characters. A display name accepts any Unicode,
 * which lets "аdmin" (Cyrillic а, U+0430) or "ѕuppоrt" (Cyrillic ѕ and о)
 * render as a staff or role account, and lets profanity slip past
 * `isLameName`, whose normaliser simply drops every non-ASCII character — so
 * "idiоt" with a Cyrillic о, "ｉｄｉｏｔ" in full-width, or "idiot" with a
 * zero-width space (U+200B) inserted all pass it today.
 *
 * Both checks work on a confusable *skeleton*: a string in which characters
 * that render alike collapse to the same Latin letter. They only ever look at
 * the parts of a name that contain non-ASCII characters. An all-ASCII name has
 * nothing to disguise, is already covered by `isLameName`, and is outside
 * this module's job; limiting the checks to non-ASCII parts is also what keeps
 * a Japanese user's "山田 support" from being judged by its ASCII half.
 *
 * Mixed scripts are deliberately *not* rejected on their own. Japanese users
 * routinely mix kanji, kana and Latin, and a name written entirely in
 * Cyrillic or Greek ("Алексей") is a real name, not an attack. The checks
 * fire only when the skeleton lands on something the platform already
 * refuses: an impersonation-sensitive reserved name, or a lame word.
 */

/**
 * Characters that render the same as a Latin letter in common UI fonts,
 * mapped to that letter.
 *
 * A hand-picked subset of Unicode TR39 `confusables.txt`
 * (https://www.unicode.org/Public/security/latest/confusables.txt), limited to
 * the Cyrillic, Greek, Armenian and Latin-extension letters whose glyph is
 * indistinguishable from an ASCII letter. The full file maps several thousand
 * code points and is not needed here: full-width forms, mathematical
 * alphanumerics, ligatures and other compatibility variants are already folded
 * to ASCII by NFKC before this table is consulted, and accented letters by
 * stripping combining marks. Letters that are only *similar* (Cyrillic т vs
 * "m", Greek ε vs "e") are left out to keep false positives on legitimately
 * Cyrillic or Greek names down.
 *
 * Keys are case-sensitive and the table is applied before lowercasing,
 * because an uppercase Cyrillic В looks like "B" while its lowercase в does
 * not look like "b".
 */
const CONFUSABLE_TO_LATIN: Readonly<Record<string, string>> = {
  // Cyrillic lowercase
  а: 'a',
  е: 'e',
  о: 'o',
  р: 'p',
  с: 'c',
  у: 'y',
  х: 'x',
  ѕ: 's',
  і: 'i',
  ј: 'j',
  ԁ: 'd',
  һ: 'h',
  ӏ: 'l',
  ԛ: 'q',
  ԝ: 'w',
  ү: 'y',
  // Cyrillic uppercase
  А: 'A',
  В: 'B',
  Е: 'E',
  К: 'K',
  М: 'M',
  Н: 'H',
  О: 'O',
  Р: 'P',
  С: 'C',
  Т: 'T',
  Х: 'X',
  У: 'Y',
  Ү: 'Y',
  Ѕ: 'S',
  І: 'I',
  Ј: 'J',
  Ԛ: 'Q',
  Ԝ: 'W',
  Ӏ: 'l',
  // Greek lowercase
  α: 'a',
  ο: 'o',
  ν: 'v',
  ι: 'i',
  κ: 'k',
  ρ: 'p',
  υ: 'u',
  χ: 'x',
  γ: 'y',
  ϲ: 'c',
  ϳ: 'j',
  // Greek uppercase
  Α: 'A',
  Β: 'B',
  Ε: 'E',
  Ζ: 'Z',
  Η: 'H',
  Ι: 'I',
  Κ: 'K',
  Μ: 'M',
  Ν: 'N',
  Ο: 'O',
  Ρ: 'P',
  Τ: 'T',
  Υ: 'Y',
  Χ: 'X',
  Ϲ: 'C',
  // Armenian
  օ: 'o',
  ս: 'u',
  հ: 'h',
  ո: 'n',
  զ: 'q',
  // Latin extensions
  ɑ: 'a',
  ɡ: 'g',
  ı: 'i',
  ȷ: 'j',
};

/**
 * Characters that render as nothing (or as blank space indistinguishable from
 * none) and so can be inserted inside a word without changing how it looks:
 * format characters (zero-width space / joiners, word joiner, BOM, bidi
 * controls — all general category Cf), variation selectors, and the Hangul
 * fillers.
 */
const INVISIBLE = /[\p{Cf}\uFE00-\uFE0F\u115F\u1160\u3164\uFFA0]/gu;

const COMBINING_MARK = /\p{M}/gu;

/**
 * Collapse `input` to the string a reader would see it as, for comparison
 * only — the result is never stored or shown.
 *
 * NFKC folds full-width and other compatibility forms to ASCII; invisible
 * characters are dropped; accents are stripped so "ádmin" reads as "admin";
 * look-alike letters are mapped through {@link CONFUSABLE_TO_LATIN}; and after
 * lowercasing, the ASCII look-alikes TR39 also treats as one — "1", "I", "l"
 * and "|"; "0" and "o"; "rn" and "m" — are merged.
 */
export function confusableSkeleton(input: string): string {
  const folded = input
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .normalize('NFD')
    .replace(COMBINING_MARK, '');
  let mapped = '';
  for (const ch of folded) {
    mapped += CONFUSABLE_TO_LATIN[ch] ?? ch;
  }
  return mapped.toLowerCase().replace(/[1i|]/g, 'l').replace(/0/g, 'o').replace(/rn/g, 'm');
}

/** Word separators: whitespace, punctuation and symbols. */
const SEPARATOR = /[\s\p{P}\p{S}]+/u;

/**
 * A character outside printable ASCII. Written as the complement of tab,
 * newlines and the printable range (space to tilde) because `no-control-regex`
 * refuses a `\x00` bound; the other ASCII control characters it therefore
 * also matches have no business in a display name either.
 */
const NON_ASCII = /[^\t\n\r -~]/;

const SENSITIVE_SKELETONS: ReadonlySet<string> = new Set(
  IMPERSONATION_SENSITIVE_NAMES.map((name) => confusableSkeleton(name.replace(/_/g, '')))
);

/**
 * Whether `displayName` passes itself off as an impersonation-sensitive
 * reserved name ("admin", "support", "official", a platform name, …) by
 * spelling it with look-alike characters.
 *
 * Two shapes are caught. A single word that is a disguised reserved name, so
 * "Official ѕupport" is caught through its second word. And the whole name
 * once separators are removed, so splitting the word ("ѕup.port") does not
 * help. Either way the part being judged must contain a non-ASCII character
 * once separators are gone: the plain-ASCII spelling of the same name is not
 * this check's concern, and neither is a plain name decorated with a
 * non-ASCII symbol ("♟ admin").
 */
export function imitatesReservedName(displayName: string): boolean {
  const words = displayName.split(SEPARATOR).filter((word) => NON_ASCII.test(word));
  if (words.some((word) => SENSITIVE_SKELETONS.has(confusableSkeleton(word)))) {
    return true;
  }
  const joined = words.length > 0 ? displayName.split(SEPARATOR).join('') : '';
  return joined !== '' && SENSITIVE_SKELETONS.has(confusableSkeleton(joined));
}

/**
 * Whether the skeleton of `displayName` contains a lame word that its raw form
 * hides from `isLameName`.
 *
 * `isLameName` is run on each maximal ASCII stretch of the skeleton, not on
 * the whole: it discards non-ASCII characters rather than treating them as
 * breaks, so feeding it "Алексей" (skeleton "aлeкceи") whole would fuse the
 * letters on either side of every unmapped Cyrillic letter into Latin
 * "words" the author never wrote.
 */
export function hidesLameName(displayName: string, isLameName: (name: string) => boolean): boolean {
  if (!NON_ASCII.test(displayName)) {
    return false;
  }
  return confusableSkeleton(displayName)
    .split(/[^\t\n\r -~]+/)
    .some((segment) => segment !== '' && isLameName(segment));
}

export type DisplayNameHomoglyphError = 'display_name_impersonation' | 'display_name_inappropriate';

/**
 * Run both homoglyph checks on a display name that has already passed the
 * plain `isLameName` check, returning the error code to surface or `null`.
 *
 * `isLameName` is injected because `@/lib/content/lame-name` is
 * `server-only`, which would make this module unloadable in a unit test or a
 * client bundle; the Server Actions pass the real one.
 */
export function checkDisplayNameHomoglyphs(
  displayName: string,
  deps: { isLameName: (name: string) => boolean }
): DisplayNameHomoglyphError | null {
  if (hidesLameName(displayName, deps.isLameName)) {
    return 'display_name_inappropriate';
  }
  if (imitatesReservedName(displayName)) {
    return 'display_name_impersonation';
  }
  return null;
}
