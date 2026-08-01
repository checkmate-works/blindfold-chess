import { describe, expect, it } from 'vitest';

import { repertoireErrorField } from './form-error-fields';

const IMPORT_FORM = ['name', 'moves'] as const;
const LINE_FORM = ['name', 'moves', 'chapter'] as const;

describe('repertoireErrorField', () => {
  it('blames the moves editor for every PGN rejection', () => {
    for (const error of ['pgnRequired', 'pgnTooLarge', 'invalidPgn', 'noMoves']) {
      expect(repertoireErrorField(error, IMPORT_FORM)).toBe('moves');
    }
  });

  it('blames the name input for the name rules', () => {
    expect(repertoireErrorField('nameRequired', IMPORT_FORM)).toBe('name');
    expect(repertoireErrorField('nameTooLong', IMPORT_FORM)).toBe('name');
  });

  it('leaves errors no control owns to the form banner', () => {
    for (const error of ['unauthorized', 'notFound', 'rateLimited', 'insufficient_balance']) {
      expect(repertoireErrorField(error, LINE_FORM)).toBeNull();
    }
  });

  it('leaves a rejection to the banner when its control is not on this form', () => {
    // The chapter picker exists on the line form only — and there only when
    // the course has chapters.
    expect(repertoireErrorField('invalidChapter', LINE_FORM)).toBe('chapter');
    expect(repertoireErrorField('invalidChapter', IMPORT_FORM)).toBeNull();
  });
});
