import { describe, expect, it } from 'vitest';

import {
  copyFromTranslationRows,
  copyToTranslationRows,
  fromLocalizedCopyDraft,
  resolveNativeCopy,
  toLocalizedCopyDraft,
} from './copy';

describe('resolveNativeCopy', () => {
  it("returns the locale's own copy when it exists", () => {
    const copy = { title: { en: 't', ja: 'タ' }, description: { en: 'd', ja: 'デ' } };
    expect(resolveNativeCopy(copy, 'ja')).toEqual({ title: 'タ', description: 'デ' });
  });

  it('falls back to en per field, so a locale may override the title alone', () => {
    const copy = { title: { en: 't', ja: 'タ' }, description: { en: 'd' } };
    expect(resolveNativeCopy(copy, 'ja')).toEqual({ title: 'タ', description: 'd' });
  });

  it('renders blank rather than throwing when even en is missing', () => {
    expect(resolveNativeCopy({ title: {}, description: {} }, 'pt-BR')).toEqual({
      title: '',
      description: '',
    });
  });
});

describe('copyFromTranslationRows', () => {
  it('folds rows into per-creative maps, leaving a NULL field unset', () => {
    const rows = [
      { creativeId: 'a', locale: 'en', title: 't', description: 'd' },
      { creativeId: 'a', locale: 'ja', title: 'タ', description: null },
      { creativeId: 'b', locale: 'en', title: 'u', description: 'e' },
    ];
    expect(copyFromTranslationRows(rows)).toEqual(
      new Map([
        ['a', { title: { en: 't', ja: 'タ' }, description: { en: 'd' } }],
        ['b', { title: { en: 'u' }, description: { en: 'e' } }],
      ])
    );
  });

  it('skips a row for a locale the site no longer serves', () => {
    const rows = [
      { creativeId: 'a', locale: 'en', title: 't', description: 'd' },
      { creativeId: 'a', locale: 'fr', title: 'titre', description: null },
    ];
    expect(copyFromTranslationRows(rows).get('a')).toEqual({
      title: { en: 't' },
      description: { en: 'd' },
    });
  });
});

describe('copyToTranslationRows', () => {
  it('writes one row per locale that says something, in the supported order', () => {
    const copy = { title: { en: 't', ja: 'タ' }, description: { en: 'd', es: 'des' } };
    expect(copyToTranslationRows('a', copy)).toEqual([
      { creativeId: 'a', locale: 'en', title: 't', description: 'd' },
      { creativeId: 'a', locale: 'es', title: null, description: 'des' },
      { creativeId: 'a', locale: 'ja', title: 'タ', description: null },
    ]);
  });

  it('writes no row for a locale with neither field, which keeps falling back to en', () => {
    expect(copyToTranslationRows('a', { title: { en: 't' }, description: { en: 'd' } })).toEqual([
      { creativeId: 'a', locale: 'en', title: 't', description: 'd' },
    ]);
  });
});

describe('localized copy drafts', () => {
  it('spreads stored copy over every locale, leaving unwritten ones blank', () => {
    expect(toLocalizedCopyDraft({ en: 't', ja: 'タ' })).toEqual({
      en: 't',
      es: '',
      'pt-BR': '',
      ja: 'タ',
    });
  });

  it('starts every locale blank for a new creative', () => {
    expect(toLocalizedCopyDraft(undefined)).toEqual({ en: '', es: '', 'pt-BR': '', ja: '' });
  });

  it('drops blank locales on the way back so they keep falling back to en', () => {
    expect(fromLocalizedCopyDraft({ en: ' t ', es: '', 'pt-BR': '  ', ja: 'タ' })).toEqual({
      en: 't',
      ja: 'タ',
    });
  });
});
