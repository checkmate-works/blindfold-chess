import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MOVE_INPUT_HINT,
  type MoveInputPreferenceHint,
  encodeMoveInputCookie,
  parseMoveInputCookie,
} from './move-input-cookie';

describe('parseMoveInputCookie', () => {
  it('parses a cookie with mode only (no enabled list)', () => {
    expect(parseMoveInputCookie('text')).toEqual({
      mode: 'text',
      enabledModes: ['text'],
    });
  });

  it('parses a cookie with mode plus enabledModes list', () => {
    expect(parseMoveInputCookie('text|text,button')).toEqual({
      mode: 'text',
      enabledModes: ['text', 'button'],
    });
  });

  it('returns the default hint for an empty string', () => {
    expect(parseMoveInputCookie('')).toEqual(DEFAULT_MOVE_INPUT_HINT);
  });

  it('returns the default hint for undefined', () => {
    expect(parseMoveInputCookie(undefined)).toEqual(DEFAULT_MOVE_INPUT_HINT);
  });

  it('returns the default hint for null', () => {
    expect(parseMoveInputCookie(null)).toEqual(DEFAULT_MOVE_INPUT_HINT);
  });

  it('returns the default hint when the mode is unknown', () => {
    expect(parseMoveInputCookie('bogus')).toEqual(DEFAULT_MOVE_INPUT_HINT);
    expect(parseMoveInputCookie('bogus|text,button')).toEqual(DEFAULT_MOVE_INPUT_HINT);
  });

  it('filters unknown entries out of the enabledModes list', () => {
    // 'bogus' should be dropped; 'text' + 'button' remain and are both valid.
    expect(parseMoveInputCookie('text|text,bogus,button')).toEqual({
      mode: 'text',
      enabledModes: ['text', 'button'],
    });
  });

  it('falls back to the first enabled mode when the declared mode is not enabled', () => {
    // `mode` is valid in isolation but not included in `enabledModes` — coerce
    // to the first enabled entry to match the localStorage reconciliation.
    expect(parseMoveInputCookie('select|text,button')).toEqual({
      mode: 'text',
      enabledModes: ['text', 'button'],
    });
  });

  it('returns the default hint when enabledModes contains only unknown values', () => {
    expect(parseMoveInputCookie('text|bogus,also-bogus')).toEqual(DEFAULT_MOVE_INPUT_HINT);
  });

  it('returns the default hint for malformed input missing the separator pipe with only noise', () => {
    // No pipe, mode token is not a known mode → falls back.
    expect(parseMoveInputCookie('not-a-mode-at-all')).toEqual(DEFAULT_MOVE_INPUT_HINT);
  });

  it('trims whitespace around enabled-mode entries', () => {
    expect(parseMoveInputCookie('button| text , button ')).toEqual({
      mode: 'button',
      enabledModes: ['text', 'button'],
    });
  });

  it('is case-sensitive: uppercased mode tokens are rejected as unknown', () => {
    // Mode names are a closed set of lowercase literals. Accepting uppercased
    // variants would widen the contract and risks coercing typos silently.
    expect(parseMoveInputCookie('TEXT')).toEqual(DEFAULT_MOVE_INPUT_HINT);
    expect(parseMoveInputCookie('Text|text,button')).toEqual(DEFAULT_MOVE_INPUT_HINT);
    expect(parseMoveInputCookie('text|TEXT,BUTTON')).toEqual(DEFAULT_MOVE_INPUT_HINT);
  });

  it('preserves duplicate entries in enabledModes (no dedupe on parse)', () => {
    // Dedup is the writer's concern (localStorage reconciliation). The cookie
    // parser is intentionally transparent so the SSR hint reflects exactly
    // what was written; the 2-mode threshold for the switch-row skeleton is
    // satisfied anyway.
    expect(parseMoveInputCookie('text|text,text,button')).toEqual({
      mode: 'text',
      enabledModes: ['text', 'text', 'button'],
    });
  });

  it('falls back to [mode] when the pipe is present but the enabled list is empty', () => {
    // Trailing pipe with no tail (`text|`) parses `enabledRaw === ''`, which
    // the parser treats the same as "no enabled list provided".
    expect(parseMoveInputCookie('text|')).toEqual({
      mode: 'text',
      enabledModes: ['text'],
    });
  });

  it('returns the default hint when enabledModes is only commas', () => {
    // `,,` yields three empty segments; after trim + filter none are valid.
    expect(parseMoveInputCookie('text|,,')).toEqual(DEFAULT_MOVE_INPUT_HINT);
  });

  it('preserves ordering of enabledModes from the cookie', () => {
    // Order matters: the first-enabled entry is used as the fallback when
    // `mode` is not in the enabled list, and UIs may render the switch row
    // in the declared order.
    expect(parseMoveInputCookie('select|button,select,text')).toEqual({
      mode: 'select',
      enabledModes: ['button', 'select', 'text'],
    });
  });

  it('tolerates very long untrusted input without throwing', () => {
    // Boundary check — make sure pathological input can't DoS or crash the
    // parser. The output must remain a valid hint (default or otherwise).
    const longGarbage = 'x'.repeat(10_000);
    const result = parseMoveInputCookie(longGarbage);
    expect(result).toEqual(DEFAULT_MOVE_INPUT_HINT);

    // Declared mode 'text' is not present after filtering, so the parser
    // coerces to the first enabled entry ('button'). The boundary assertion
    // is that the function returns a valid hint without throwing, regardless
    // of input size.
    const longEnabledTail = `text|${'bogus,'.repeat(5_000)}button`;
    const result2 = parseMoveInputCookie(longEnabledTail);
    expect(result2).toEqual({ mode: 'button', enabledModes: ['button'] });
  });
});

describe('encodeMoveInputCookie', () => {
  it('encodes mode with a single-entry enabled list', () => {
    expect(encodeMoveInputCookie({ mode: 'text', enabledModes: ['text'] })).toBe('text|text');
  });

  it('encodes mode with a multi-entry enabled list preserving order', () => {
    expect(
      encodeMoveInputCookie({ mode: 'select', enabledModes: ['button', 'select', 'text'] })
    ).toBe('select|button,select,text');
  });

  it('falls back to [mode] when enabledModes is empty (defensive)', () => {
    // The encoder should never emit a trailing bare pipe — an empty enabled
    // list is meaningless, so the mode itself is substituted.
    expect(encodeMoveInputCookie({ mode: 'button', enabledModes: [] })).toBe('button|button');
  });
});

describe('encode ↔ parse round-trip', () => {
  const cases: MoveInputPreferenceHint[] = [
    { mode: 'button', enabledModes: ['button'] },
    { mode: 'text', enabledModes: ['text'] },
    { mode: 'select', enabledModes: ['select'] },
    { mode: 'text', enabledModes: ['text', 'button'] },
    { mode: 'select', enabledModes: ['button', 'select', 'text'] },
  ];

  it.each(cases)('parse(encode($hint)) === $hint', (hint) => {
    expect(parseMoveInputCookie(encodeMoveInputCookie(hint))).toEqual(hint);
  });

  it('is idempotent when applied twice (parse∘encode∘parse∘encode)', () => {
    const hint: MoveInputPreferenceHint = { mode: 'text', enabledModes: ['text', 'button'] };
    const once = parseMoveInputCookie(encodeMoveInputCookie(hint));
    const twice = parseMoveInputCookie(encodeMoveInputCookie(once));
    expect(twice).toEqual(hint);
  });
});
