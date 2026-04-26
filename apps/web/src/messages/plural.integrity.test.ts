import { IntlMessageFormat } from 'intl-messageformat';
import { describe, expect, it } from 'vitest';

import enMessages from './en.json';
import esMessages from './es.json';
import jaMessages from './ja.json';
import ptBRMessages from './pt-BR.json';

// Regression guard for ICU plural conversion across locales.
//
// Background: On branch i18n-pt, ten message keys were migrated from plain
// "{count} X" interpolation to ICU plural form
// ("{count, plural, one {# X} other {# Xs}}") in en/ja/es/pt-BR.json. The
// primary motivation was to fix pt-BR grammar (e.g., "1 segundos" must be
// "1 segundo"). This file locks the ICU template shape in place by formatting
// every affected key across every locale at boundary counts {0, 1, 2} and
// asserting on the produced string.
//
// Note on pt-BR CLDR pluralization:
//   Portuguese CLDR assigns count=0 to the `one` category (i = 0..1). So
//   "0 segundo" (NOT "0 segundos") is the correct, CLDR-compliant output for
//   the pt-BR pattern `one {# segundo} other {# segundos}`. This differs from
//   Spanish (0 -> other) and matches actual ICU / CLDR behavior. Tests below
//   reflect what IntlMessageFormat actually produces, which is also what
//   end users will see at runtime via next-intl.
//
//   If product copy ever needs a distinct zero message (e.g., "Nenhum termo
//   encontrado" instead of "0 termo encontrado"), add an explicit `=0 {...}`
//   branch to the ICU template in the relevant message files — `=0` is
//   matched before the CLDR category and overrides the `one` branch — and
//   update the corresponding `count=0` case below to the new expected string.

const locales = {
  en: enMessages as unknown as Record<string, unknown>,
  ja: jaMessages as unknown as Record<string, unknown>,
  es: esMessages as unknown as Record<string, unknown>,
  'pt-BR': ptBRMessages as unknown as Record<string, unknown>,
};

function getAt(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
      obj
    );
}

function format(locale: keyof typeof locales, path: string, count: number): string {
  const template = getAt(locales[locale], path);
  if (typeof template !== 'string') {
    throw new Error(`Message at "${path}" for locale "${locale}" is not a string`);
  }
  const mf = new IntlMessageFormat(template, locale);
  const result = mf.format({ count });
  // format() can return a string, a number, or an array; for these templates
  // it is always a string. Normalize defensively.
  return Array.isArray(result) ? result.join('') : String(result);
}

// The 10 affected keys, across en/ja/es/pt-BR, at boundary counts 0, 1, 2.
// Each row is the exact string IntlMessageFormat is expected to emit for
// the given (locale, key, count) tuple. For pt-BR the count=0 case takes
// the `one` branch (CLDR: i = 0..1).
type Case = {
  locale: keyof typeof locales;
  key: string;
  count: number;
  expect: string;
};

const cases: Case[] = [
  // 1. practice.positionMemory.detail.seconds
  { locale: 'en', key: 'practice.positionMemory.detail.seconds', count: 0, expect: '0 seconds' },
  { locale: 'en', key: 'practice.positionMemory.detail.seconds', count: 1, expect: '1 second' },
  { locale: 'en', key: 'practice.positionMemory.detail.seconds', count: 2, expect: '2 seconds' },
  { locale: 'ja', key: 'practice.positionMemory.detail.seconds', count: 0, expect: '0 秒' },
  { locale: 'ja', key: 'practice.positionMemory.detail.seconds', count: 1, expect: '1 秒' },
  { locale: 'ja', key: 'practice.positionMemory.detail.seconds', count: 2, expect: '2 秒' },
  { locale: 'es', key: 'practice.positionMemory.detail.seconds', count: 0, expect: '0 segundos' },
  { locale: 'es', key: 'practice.positionMemory.detail.seconds', count: 1, expect: '1 segundo' },
  { locale: 'es', key: 'practice.positionMemory.detail.seconds', count: 2, expect: '2 segundos' },
  {
    locale: 'pt-BR',
    key: 'practice.positionMemory.detail.seconds',
    count: 0,
    expect: '0 segundo',
  },
  {
    locale: 'pt-BR',
    key: 'practice.positionMemory.detail.seconds',
    count: 1,
    expect: '1 segundo',
  },
  {
    locale: 'pt-BR',
    key: 'practice.positionMemory.detail.seconds',
    count: 2,
    expect: '2 segundos',
  },

  // 2. play.result.operationSummary.times
  { locale: 'en', key: 'play.result.operationSummary.times', count: 0, expect: '0 times' },
  { locale: 'en', key: 'play.result.operationSummary.times', count: 1, expect: '1 time' },
  { locale: 'en', key: 'play.result.operationSummary.times', count: 2, expect: '2 times' },
  { locale: 'ja', key: 'play.result.operationSummary.times', count: 0, expect: '0回' },
  { locale: 'ja', key: 'play.result.operationSummary.times', count: 1, expect: '1回' },
  { locale: 'ja', key: 'play.result.operationSummary.times', count: 2, expect: '2回' },
  { locale: 'es', key: 'play.result.operationSummary.times', count: 0, expect: '0 veces' },
  { locale: 'es', key: 'play.result.operationSummary.times', count: 1, expect: '1 vez' },
  { locale: 'es', key: 'play.result.operationSummary.times', count: 2, expect: '2 veces' },
  { locale: 'pt-BR', key: 'play.result.operationSummary.times', count: 0, expect: '0 vez' },
  { locale: 'pt-BR', key: 'play.result.operationSummary.times', count: 1, expect: '1 vez' },
  { locale: 'pt-BR', key: 'play.result.operationSummary.times', count: 2, expect: '2 vezes' },

  // 3. bulkDelete.selectedCount
  { locale: 'en', key: 'bulkDelete.selectedCount', count: 0, expect: '0 games selected' },
  { locale: 'en', key: 'bulkDelete.selectedCount', count: 1, expect: '1 game selected' },
  { locale: 'en', key: 'bulkDelete.selectedCount', count: 2, expect: '2 games selected' },
  { locale: 'ja', key: 'bulkDelete.selectedCount', count: 0, expect: '0個のゲームを選択中' },
  { locale: 'ja', key: 'bulkDelete.selectedCount', count: 1, expect: '1個のゲームを選択中' },
  { locale: 'ja', key: 'bulkDelete.selectedCount', count: 2, expect: '2個のゲームを選択中' },
  { locale: 'es', key: 'bulkDelete.selectedCount', count: 0, expect: '0 partidas seleccionadas' },
  { locale: 'es', key: 'bulkDelete.selectedCount', count: 1, expect: '1 partida seleccionada' },
  { locale: 'es', key: 'bulkDelete.selectedCount', count: 2, expect: '2 partidas seleccionadas' },
  { locale: 'pt-BR', key: 'bulkDelete.selectedCount', count: 0, expect: '0 partida selecionada' },
  { locale: 'pt-BR', key: 'bulkDelete.selectedCount', count: 1, expect: '1 partida selecionada' },
  {
    locale: 'pt-BR',
    key: 'bulkDelete.selectedCount',
    count: 2,
    expect: '2 partidas selecionadas',
  },

  // 4. bulkDelete.deletedToast
  {
    locale: 'en',
    key: 'bulkDelete.deletedToast',
    count: 0,
    expect: '0 games deleted successfully',
  },
  {
    locale: 'en',
    key: 'bulkDelete.deletedToast',
    count: 1,
    expect: '1 game deleted successfully',
  },
  {
    locale: 'en',
    key: 'bulkDelete.deletedToast',
    count: 2,
    expect: '2 games deleted successfully',
  },
  { locale: 'ja', key: 'bulkDelete.deletedToast', count: 0, expect: '0個のゲームを削除しました' },
  { locale: 'ja', key: 'bulkDelete.deletedToast', count: 1, expect: '1個のゲームを削除しました' },
  { locale: 'ja', key: 'bulkDelete.deletedToast', count: 2, expect: '2個のゲームを削除しました' },
  {
    locale: 'es',
    key: 'bulkDelete.deletedToast',
    count: 0,
    expect: '0 partidas eliminadas correctamente',
  },
  {
    locale: 'es',
    key: 'bulkDelete.deletedToast',
    count: 1,
    expect: '1 partida eliminada correctamente',
  },
  {
    locale: 'es',
    key: 'bulkDelete.deletedToast',
    count: 2,
    expect: '2 partidas eliminadas correctamente',
  },
  {
    locale: 'pt-BR',
    key: 'bulkDelete.deletedToast',
    count: 0,
    expect: '0 partida excluída com sucesso',
  },
  {
    locale: 'pt-BR',
    key: 'bulkDelete.deletedToast',
    count: 1,
    expect: '1 partida excluída com sucesso',
  },
  {
    locale: 'pt-BR',
    key: 'bulkDelete.deletedToast',
    count: 2,
    expect: '2 partidas excluídas com sucesso',
  },

  // 5. home.gameList.gamesDeletedToast
  {
    locale: 'en',
    key: 'home.gameList.gamesDeletedToast',
    count: 0,
    expect: '0 games deleted successfully',
  },
  {
    locale: 'en',
    key: 'home.gameList.gamesDeletedToast',
    count: 1,
    expect: '1 game deleted successfully',
  },
  {
    locale: 'en',
    key: 'home.gameList.gamesDeletedToast',
    count: 2,
    expect: '2 games deleted successfully',
  },
  {
    locale: 'ja',
    key: 'home.gameList.gamesDeletedToast',
    count: 0,
    expect: '0個のゲームを削除しました',
  },
  {
    locale: 'ja',
    key: 'home.gameList.gamesDeletedToast',
    count: 1,
    expect: '1個のゲームを削除しました',
  },
  {
    locale: 'ja',
    key: 'home.gameList.gamesDeletedToast',
    count: 2,
    expect: '2個のゲームを削除しました',
  },
  {
    locale: 'es',
    key: 'home.gameList.gamesDeletedToast',
    count: 0,
    expect: '0 partidas eliminadas correctamente',
  },
  {
    locale: 'es',
    key: 'home.gameList.gamesDeletedToast',
    count: 1,
    expect: '1 partida eliminada correctamente',
  },
  {
    locale: 'es',
    key: 'home.gameList.gamesDeletedToast',
    count: 2,
    expect: '2 partidas eliminadas correctamente',
  },
  {
    locale: 'pt-BR',
    key: 'home.gameList.gamesDeletedToast',
    count: 0,
    expect: '0 partida excluída com sucesso',
  },
  {
    locale: 'pt-BR',
    key: 'home.gameList.gamesDeletedToast',
    count: 1,
    expect: '1 partida excluída com sucesso',
  },
  {
    locale: 'pt-BR',
    key: 'home.gameList.gamesDeletedToast',
    count: 2,
    expect: '2 partidas excluídas com sucesso',
  },

  // 6. toast.gamesDeleted
  { locale: 'en', key: 'toast.gamesDeleted', count: 0, expect: '0 games deleted successfully' },
  { locale: 'en', key: 'toast.gamesDeleted', count: 1, expect: '1 game deleted successfully' },
  { locale: 'en', key: 'toast.gamesDeleted', count: 2, expect: '2 games deleted successfully' },
  { locale: 'ja', key: 'toast.gamesDeleted', count: 0, expect: '0個のゲームを削除しました' },
  { locale: 'ja', key: 'toast.gamesDeleted', count: 1, expect: '1個のゲームを削除しました' },
  { locale: 'ja', key: 'toast.gamesDeleted', count: 2, expect: '2個のゲームを削除しました' },
  {
    locale: 'es',
    key: 'toast.gamesDeleted',
    count: 0,
    expect: '0 partidas eliminadas correctamente',
  },
  {
    locale: 'es',
    key: 'toast.gamesDeleted',
    count: 1,
    expect: '1 partida eliminada correctamente',
  },
  {
    locale: 'es',
    key: 'toast.gamesDeleted',
    count: 2,
    expect: '2 partidas eliminadas correctamente',
  },
  {
    locale: 'pt-BR',
    key: 'toast.gamesDeleted',
    count: 0,
    expect: '0 partida excluída com sucesso',
  },
  {
    locale: 'pt-BR',
    key: 'toast.gamesDeleted',
    count: 1,
    expect: '1 partida excluída com sucesso',
  },
  {
    locale: 'pt-BR',
    key: 'toast.gamesDeleted',
    count: 2,
    expect: '2 partidas excluídas com sucesso',
  },

  // 7. glossary.letterPage.count
  { locale: 'en', key: 'glossary.letterPage.count', count: 0, expect: '0 terms found' },
  { locale: 'en', key: 'glossary.letterPage.count', count: 1, expect: '1 term found' },
  { locale: 'en', key: 'glossary.letterPage.count', count: 2, expect: '2 terms found' },
  { locale: 'ja', key: 'glossary.letterPage.count', count: 0, expect: '0件の用語' },
  { locale: 'ja', key: 'glossary.letterPage.count', count: 1, expect: '1件の用語' },
  { locale: 'ja', key: 'glossary.letterPage.count', count: 2, expect: '2件の用語' },
  { locale: 'es', key: 'glossary.letterPage.count', count: 0, expect: '0 términos encontrados' },
  { locale: 'es', key: 'glossary.letterPage.count', count: 1, expect: '1 término encontrado' },
  { locale: 'es', key: 'glossary.letterPage.count', count: 2, expect: '2 términos encontrados' },
  { locale: 'pt-BR', key: 'glossary.letterPage.count', count: 0, expect: '0 termo encontrado' },
  { locale: 'pt-BR', key: 'glossary.letterPage.count', count: 1, expect: '1 termo encontrado' },
  { locale: 'pt-BR', key: 'glossary.letterPage.count', count: 2, expect: '2 termos encontrados' },

  // 8. glossary.categoryPage.count
  { locale: 'en', key: 'glossary.categoryPage.count', count: 0, expect: '0 terms found' },
  { locale: 'en', key: 'glossary.categoryPage.count', count: 1, expect: '1 term found' },
  { locale: 'en', key: 'glossary.categoryPage.count', count: 2, expect: '2 terms found' },
  { locale: 'ja', key: 'glossary.categoryPage.count', count: 0, expect: '0件の用語' },
  { locale: 'ja', key: 'glossary.categoryPage.count', count: 1, expect: '1件の用語' },
  { locale: 'ja', key: 'glossary.categoryPage.count', count: 2, expect: '2件の用語' },
  { locale: 'es', key: 'glossary.categoryPage.count', count: 0, expect: '0 términos encontrados' },
  { locale: 'es', key: 'glossary.categoryPage.count', count: 1, expect: '1 término encontrado' },
  { locale: 'es', key: 'glossary.categoryPage.count', count: 2, expect: '2 términos encontrados' },
  { locale: 'pt-BR', key: 'glossary.categoryPage.count', count: 0, expect: '0 termo encontrado' },
  { locale: 'pt-BR', key: 'glossary.categoryPage.count', count: 1, expect: '1 termo encontrado' },
  {
    locale: 'pt-BR',
    key: 'glossary.categoryPage.count',
    count: 2,
    expect: '2 termos encontrados',
  },

  // 9. practice.moveSequence.attempts
  { locale: 'en', key: 'practice.moveSequence.attempts', count: 0, expect: '0 attempts' },
  { locale: 'en', key: 'practice.moveSequence.attempts', count: 1, expect: '1 attempt' },
  { locale: 'en', key: 'practice.moveSequence.attempts', count: 2, expect: '2 attempts' },
  { locale: 'ja', key: 'practice.moveSequence.attempts', count: 0, expect: '0回試行' },
  { locale: 'ja', key: 'practice.moveSequence.attempts', count: 1, expect: '1回試行' },
  { locale: 'ja', key: 'practice.moveSequence.attempts', count: 2, expect: '2回試行' },
  { locale: 'es', key: 'practice.moveSequence.attempts', count: 0, expect: '0 intentos' },
  { locale: 'es', key: 'practice.moveSequence.attempts', count: 1, expect: '1 intento' },
  { locale: 'es', key: 'practice.moveSequence.attempts', count: 2, expect: '2 intentos' },
  { locale: 'pt-BR', key: 'practice.moveSequence.attempts', count: 0, expect: '0 tentativa' },
  { locale: 'pt-BR', key: 'practice.moveSequence.attempts', count: 1, expect: '1 tentativa' },
  { locale: 'pt-BR', key: 'practice.moveSequence.attempts', count: 2, expect: '2 tentativas' },

  // 10. pgnInput.validWithMoves
  { locale: 'en', key: 'pgnInput.validWithMoves', count: 0, expect: '✓ Valid PGN with 0 moves' },
  { locale: 'en', key: 'pgnInput.validWithMoves', count: 1, expect: '✓ Valid PGN with 1 move' },
  { locale: 'en', key: 'pgnInput.validWithMoves', count: 2, expect: '✓ Valid PGN with 2 moves' },
  { locale: 'ja', key: 'pgnInput.validWithMoves', count: 0, expect: '✓ 有効なPGN（0手）' },
  { locale: 'ja', key: 'pgnInput.validWithMoves', count: 1, expect: '✓ 有効なPGN（1手）' },
  { locale: 'ja', key: 'pgnInput.validWithMoves', count: 2, expect: '✓ 有効なPGN（2手）' },
  {
    locale: 'es',
    key: 'pgnInput.validWithMoves',
    count: 0,
    expect: '✓ PGN válido con 0 movimientos',
  },
  {
    locale: 'es',
    key: 'pgnInput.validWithMoves',
    count: 1,
    expect: '✓ PGN válido con 1 movimiento',
  },
  {
    locale: 'es',
    key: 'pgnInput.validWithMoves',
    count: 2,
    expect: '✓ PGN válido con 2 movimientos',
  },
  {
    locale: 'pt-BR',
    key: 'pgnInput.validWithMoves',
    count: 0,
    expect: '✓ PGN válido com 0 movimento',
  },
  {
    locale: 'pt-BR',
    key: 'pgnInput.validWithMoves',
    count: 1,
    expect: '✓ PGN válido com 1 movimento',
  },
  {
    locale: 'pt-BR',
    key: 'pgnInput.validWithMoves',
    count: 2,
    expect: '✓ PGN válido com 2 movimentos',
  },

  // 11. practice.puzzle.preview.moveCount — added when the puzzle creation
  // preview page was introduced. Each locale provides its own plural shape;
  // ja keeps the non-plural counter "N 手" unchanged.
  { locale: 'en', key: 'practice.puzzle.preview.moveCount', count: 0, expect: '0 moves' },
  { locale: 'en', key: 'practice.puzzle.preview.moveCount', count: 1, expect: '1 move' },
  { locale: 'en', key: 'practice.puzzle.preview.moveCount', count: 2, expect: '2 moves' },
  { locale: 'ja', key: 'practice.puzzle.preview.moveCount', count: 0, expect: '0 手' },
  { locale: 'ja', key: 'practice.puzzle.preview.moveCount', count: 1, expect: '1 手' },
  { locale: 'ja', key: 'practice.puzzle.preview.moveCount', count: 2, expect: '2 手' },
  { locale: 'es', key: 'practice.puzzle.preview.moveCount', count: 0, expect: '0 movimientos' },
  { locale: 'es', key: 'practice.puzzle.preview.moveCount', count: 1, expect: '1 movimiento' },
  { locale: 'es', key: 'practice.puzzle.preview.moveCount', count: 2, expect: '2 movimientos' },
  { locale: 'pt-BR', key: 'practice.puzzle.preview.moveCount', count: 0, expect: '0 lance' },
  { locale: 'pt-BR', key: 'practice.puzzle.preview.moveCount', count: 1, expect: '1 lance' },
  { locale: 'pt-BR', key: 'practice.puzzle.preview.moveCount', count: 2, expect: '2 lances' },
];

describe('ICU plural integrity across locales', () => {
  it('covers all 11 affected keys at counts 0, 1, 2 across en/ja/es/pt-BR (11 x 3 x 4 = 132 cases)', () => {
    expect(cases).toHaveLength(132);
  });

  for (const c of cases) {
    it(`${c.locale} :: ${c.key} @ count=${c.count} -> "${c.expect}"`, () => {
      expect(format(c.locale, c.key, c.count)).toBe(c.expect);
    });
  }

  // pt-BR H1 regression guard — the whole reason for the migration.
  // These assertions deliberately duplicate the table above, but stand
  // alone so a targeted `test:run plural` grep shows them by name.
  describe('pt-BR singular-form regression guard (H1 fix)', () => {
    it('"1 segundo" (not "1 segundos")', () => {
      const out = format('pt-BR', 'practice.positionMemory.detail.seconds', 1);
      expect(out).toBe('1 segundo');
      expect(out).not.toBe('1 segundos');
    });

    it('"1 vez" (not "1 vezes")', () => {
      const out = format('pt-BR', 'play.result.operationSummary.times', 1);
      expect(out).toBe('1 vez');
      expect(out).not.toBe('1 vezes');
    });

    it('"1 tentativa" (not "1 tentativas")', () => {
      const out = format('pt-BR', 'practice.moveSequence.attempts', 1);
      expect(out).toBe('1 tentativa');
      expect(out).not.toBe('1 tentativas');
    });

    it('"1 partida selecionada" (not "1 partidas selecionadas")', () => {
      const out = format('pt-BR', 'bulkDelete.selectedCount', 1);
      expect(out).toBe('1 partida selecionada');
      expect(out).not.toBe('1 partidas selecionadas');
    });

    it('"1 partida excluída com sucesso" (not "1 partidas excluídas com sucesso")', () => {
      const out = format('pt-BR', 'bulkDelete.deletedToast', 1);
      expect(out).toBe('1 partida excluída com sucesso');
      expect(out).not.toBe('1 partidas excluídas com sucesso');
    });

    it('"1 termo encontrado" (not "1 termos encontrados")', () => {
      const out = format('pt-BR', 'glossary.letterPage.count', 1);
      expect(out).toBe('1 termo encontrado');
      expect(out).not.toBe('1 termos encontrados');
    });

    it('"1 movimento" (not "1 movimentos")', () => {
      const out = format('pt-BR', 'pgnInput.validWithMoves', 1);
      expect(out).toBe('✓ PGN válido com 1 movimento');
      expect(out).not.toBe('✓ PGN válido com 1 movimentos');
    });
  });
});

describe('pt-BR brand fix (M7)', () => {
  // Verifies that the pt-BR translation uses the localized brand
  // "Xadrez às Cegas" and does not leak the English source phrase
  // "Blindfold Chess" in the subscription page description.
  it('MypageSubscription.noSubscriptionDescription contains "Xadrez às Cegas"', () => {
    const value = getAt(locales['pt-BR'], 'MypageSubscription.noSubscriptionDescription');
    expect(typeof value).toBe('string');
    expect(value as string).toContain('Xadrez às Cegas');
    expect(value as string).not.toContain('Blindfold Chess');
  });

  it('pt-BR.json does not contain the English phrase "Blindfold Chess" anywhere', () => {
    const serialized = JSON.stringify(ptBRMessages);
    expect(serialized).not.toContain('Blindfold Chess');
  });
});
