import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import enMessages from '@/messages/en.json';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { usePgnValidation } from './use-pgn-validation';

afterEach(() => {
  cleanup();
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={enMessages as unknown as Record<string, unknown>}
      timeZone="UTC"
    >
      <IntlAvailableContext.Provider value={true}>{children}</IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );
}

function validate(pgn: string, showValidation = true) {
  return renderHook(() => usePgnValidation({ debouncedValue: pgn, showValidation }), { wrapper })
    .result.current;
}

describe('usePgnValidation', () => {
  describe('verdict (chess.js remains the authority)', () => {
    it('accepts a legal game', () => {
      const r = validate('1. e4 e5 2. Nf3 Nc6');
      expect(r.showSuccess).toBe(true);
      expect(r.showError).toBe(false);
      expect(r.errorMessage).toBeNull();
    });

    it('rejects a game with an unplayable move', () => {
      expect(validate('1. e4 e5 2. Bf8').showError).toBe(true);
    });

    it('stays silent on empty input and when validation is switched off', () => {
      expect(validate('').showError).toBe(false);
      expect(validate('   ').showSuccess).toBe(false);
      expect(validate('1. e4 e5 2. Bf8', false).showError).toBe(false);
    });
  });

  describe('explanation', () => {
    it('locates the offending move by move number and ply', () => {
      const r = validate(
        '1. Nf3 d5 2. g3 d4 3. c3 dxc3 4. bxc3 Nc6 5. Bg2 e6 6. d4 b6 7. Ne5 Nxe5 8. Bxa8 d7 9. Bg2 Ng6'
      );
      expect(r.errorMessage).toBe("Can't play d7 at move 8, ply 16");
      // The move name still drives PgnInput's click-to-select affordance.
      expect(r.invalidMove).toBe('d7');
    });

    it('names a move that is not notation at all', () => {
      const r = validate('1. e4 Zz9');
      expect(r.invalidMove).toBe('Zz9');
      expect(r.errorMessage).toContain('Zz9');
    });

    it('does not echo a rejected token that is not move-shaped', () => {
      const r = validate('1. e4 <script>alert</script>');
      expect(r.showError).toBe(true);
      expect(r.invalidMove).toBeNull();
      expect(r.errorMessage).toBe('This PGN could not be read. Check the notation.');
    });
  });
});
