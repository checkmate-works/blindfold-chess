import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import enMessages from '@/messages/en.json';
import * as matchers from '@testing-library/jest-dom/matchers';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PgnDiagnosisHint } from './PgnDiagnosisHint';

expect.extend(matchers);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

function wrap(ui: ReactNode) {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={enMessages as unknown as Record<string, unknown>}
      timeZone="UTC"
    >
      <IntlAvailableContext.Provider value={true}>{ui}</IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );
}

/** Render, then run past the debounce so the verdict has been computed. */
function renderHint(pgn: string) {
  const result = render(wrap(<PgnDiagnosisHint pgn={pgn} id="pgn-error" />));
  act(() => {
    vi.runAllTimers();
  });
  return result;
}

describe('PgnDiagnosisHint', () => {
  it('names the move that cannot be played, worded as Lichess does', () => {
    renderHint(
      '1. Nf3 d5 2. g3 d4 3. c3 dxc3 4. bxc3 Nc6 5. Bg2 e6 6. d4 b6 7. Ne5 Nxe5 8. Bxa8 d7 9. Bg2 Ng6'
    );

    expect(screen.getByRole('alert')).toHaveTextContent("Can't play d7 at move 8, ply 16");
  });

  it('says nothing about a PGN that parses', () => {
    renderHint('1. e4 c5 2. Nf3 d6 (2... Nc6 3. d4) 3. d4');

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says nothing while the field is still empty', () => {
    renderHint('');

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('waits for the typing pause before judging', () => {
    // "1. e" is not a move, but it is a plausible keystroke on the way to one.
    render(wrap(<PgnDiagnosisHint pgn="1. e" id="pgn-error" />));

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('clears once the author fixes the notation', () => {
    const { rerender } = render(wrap(<PgnDiagnosisHint pgn="1. e4 Zz9" id="pgn-error" />));
    act(() => {
      vi.runAllTimers();
    });
    expect(screen.queryByRole('alert')).not.toBeNull();

    rerender(wrap(<PgnDiagnosisHint pgn="1. e4 e5" id="pgn-error" />));
    act(() => {
      vi.runAllTimers();
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
