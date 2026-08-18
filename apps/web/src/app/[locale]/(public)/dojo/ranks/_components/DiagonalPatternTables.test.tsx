/**
 * Regression tests for `DiagonalPatternTables`.
 *
 * Background: prior to this fix, pages 6 and 7 of the 3kyu rank guide
 * contained hardcoded Japanese strings (e.g. "始点"/"終点", "aファイル始点")
 * in the table captions and headers — these were rendered regardless of the
 * active locale. The fix migrates those strings to `next-intl` keys under
 * `guides.visualAids.diagonalPatternTables`.
 *
 * These tests mount the components inside a real `NextIntlClientProvider`
 * for each supported locale and assert that the translated caption and
 * header text actually render — guarding against re-introduction of the
 * hardcoded-language bug.
 */
import type { ReactNode } from 'react';

import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import jaMessages from '@/messages/ja.json';
import * as matchers from '@testing-library/jest-dom/matchers';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AntiDiagAFileTable,
  AntiDiagRank8Table,
  DiagonalAFileTable,
  DiagonalRank1Table,
} from './DiagonalPatternTables';

expect.extend(matchers);

const localeMessages = {
  en: enMessages,
  es: esMessages,
  ja: jaMessages,
} as const;

type Locale = keyof typeof localeMessages;

function renderWithLocale(locale: Locale, ui: ReactNode) {
  return render(
    <NextIntlClientProvider
      locale={locale}
      messages={localeMessages[locale] as unknown as Record<string, unknown>}
      timeZone="UTC"
    >
      <IntlAvailableContext.Provider value={true}>{ui}</IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );
}

type ExpectedStrings = {
  start: string;
  end: string;
  aFileStart: string;
  rank1Start: string;
  rank8Start: string;
};

const EXPECTED: Record<Locale, ExpectedStrings> = {
  en: {
    start: 'Start',
    end: 'End',
    aFileStart: 'Starting from a-file',
    rank1Start: 'Starting from 1st rank',
    rank8Start: 'Starting from 8th rank',
  },
  es: {
    start: 'Inicio',
    end: 'Fin',
    aFileStart: 'Inicio en la columna a',
    rank1Start: 'Inicio en la fila 1',
    rank8Start: 'Inicio en la fila 8',
  },
  ja: {
    start: '始点',
    end: '終点',
    aFileStart: 'aファイル始点',
    rank1Start: '1ランク始点',
    rank8Start: '8ランク始点',
  },
};

describe('DiagonalPatternTables — locale-aware captions (regression guard)', () => {
  (['en', 'es', 'ja'] as const).forEach((locale) => {
    describe(`locale: ${locale}`, () => {
      it('DiagonalAFileTable renders translated caption and headers', () => {
        renderWithLocale(locale, <DiagonalAFileTable />);
        const expected = EXPECTED[locale];
        expect(screen.getByText(expected.aFileStart)).toBeInTheDocument();
        expect(screen.getByText(expected.start)).toBeInTheDocument();
        expect(screen.getByText(expected.end)).toBeInTheDocument();
      });

      it('DiagonalRank1Table renders translated caption and headers', () => {
        renderWithLocale(locale, <DiagonalRank1Table />);
        const expected = EXPECTED[locale];
        expect(screen.getByText(expected.rank1Start)).toBeInTheDocument();
        expect(screen.getByText(expected.start)).toBeInTheDocument();
        expect(screen.getByText(expected.end)).toBeInTheDocument();
      });

      it('AntiDiagAFileTable renders translated caption (shared aFileStart key) and headers', () => {
        renderWithLocale(locale, <AntiDiagAFileTable />);
        const expected = EXPECTED[locale];
        expect(screen.getByText(expected.aFileStart)).toBeInTheDocument();
        expect(screen.getByText(expected.start)).toBeInTheDocument();
        expect(screen.getByText(expected.end)).toBeInTheDocument();
      });

      it('AntiDiagRank8Table renders translated caption and headers', () => {
        renderWithLocale(locale, <AntiDiagRank8Table />);
        const expected = EXPECTED[locale];
        expect(screen.getByText(expected.rank8Start)).toBeInTheDocument();
        expect(screen.getByText(expected.start)).toBeInTheDocument();
        expect(screen.getByText(expected.end)).toBeInTheDocument();
      });
    });
  });

  it('renders the hardcoded square coordinates (a1, h8, etc.) regardless of locale', () => {
    // Coordinates are intentionally locale-agnostic (they are chess notation,
    // not natural language). This test guards against someone over-correcting
    // and accidentally translating the coordinate cells.
    renderWithLocale('ja', <DiagonalAFileTable />);
    expect(screen.getByText('a1')).toBeInTheDocument();
    expect(screen.getByText('h8')).toBeInTheDocument();
  });

  it('does NOT leak Japanese strings into the English render (original bug)', () => {
    renderWithLocale('en', <DiagonalAFileTable />);
    // Original bug: these literal strings appeared in every locale.
    expect(screen.queryByText('始点')).not.toBeInTheDocument();
    expect(screen.queryByText('終点')).not.toBeInTheDocument();
    expect(screen.queryByText('aファイル始点')).not.toBeInTheDocument();
  });

  it('does NOT leak Japanese strings into the Spanish render (original bug)', () => {
    renderWithLocale('es', <AntiDiagRank8Table />);
    expect(screen.queryByText('始点')).not.toBeInTheDocument();
    expect(screen.queryByText('終点')).not.toBeInTheDocument();
    expect(screen.queryByText('8ランク始点')).not.toBeInTheDocument();
  });
});
