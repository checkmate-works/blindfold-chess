import { describe, expect, it } from 'vitest';

import {
  CHUNK_DESCRIPTION_MAX_LENGTH,
  CHUNK_SLUG_MAX_LENGTH,
  CHUNK_TITLE_MAX_LENGTH,
} from '@/lib/chunks/validation';

import { validateChunkForm } from './chunk-form-validation';

const valid = {
  isFenValid: true,
  title: 'Fianchetto',
  slug: 'fianchetto',
  status: 'published',
  description: 'Bishop on the long diagonal.',
} as const;

describe('validateChunkForm', () => {
  it('passes a complete form', () => {
    expect(validateChunkForm(valid)).toBeNull();
  });

  it('reports the first failing rule in gate order, tagged with its field', () => {
    expect(validateChunkForm({ ...valid, isFenValid: false, title: ' ' })).toEqual({
      field: 'fen',
      key: 'errors.invalidFen',
    });
    expect(validateChunkForm({ ...valid, title: '  ' })).toEqual({
      field: 'title',
      key: 'errors.titleRequired',
    });
    expect(validateChunkForm({ ...valid, slug: '' })).toEqual({
      field: 'slug',
      key: 'errors.slugRequired',
    });
  });

  it('requires a description only when publishing on creation', () => {
    expect(validateChunkForm({ ...valid, description: '' })).toEqual({
      field: 'description',
      key: 'errors.descriptionRequired',
    });
    expect(validateChunkForm({ ...valid, status: 'draft', description: '' })).toBeNull();
  });

  // These used to reach the server, which answers in untranslated English
  // from the preview step — see the module TSDoc.
  describe('slug shape', () => {
    it('rejects anything outside lowercase / digits / single hyphens', () => {
      for (const slug of ['Rook-Battery', 'rook battery', 'rook--battery', '-rook', 'rook-']) {
        expect(validateChunkForm({ ...valid, slug })).toEqual({
          field: 'slug',
          key: 'errors.slugInvalid',
        });
      }
    });

    it('accepts a slug at exactly the cap and rejects one past it', () => {
      const atCap = 'a'.repeat(CHUNK_SLUG_MAX_LENGTH);
      expect(validateChunkForm({ ...valid, slug: atCap })).toBeNull();
      expect(validateChunkForm({ ...valid, slug: `${atCap}a` })).toEqual({
        field: 'slug',
        key: 'errors.slugTooLong',
        values: { max: CHUNK_SLUG_MAX_LENGTH },
      });
    });

    // An over-long slug that is also malformed reads better as "too long".
    it('prefers the length verdict when both rules fail', () => {
      expect(validateChunkForm({ ...valid, slug: 'A'.repeat(CHUNK_SLUG_MAX_LENGTH + 1) })).toEqual({
        field: 'slug',
        key: 'errors.slugTooLong',
        values: { max: CHUNK_SLUG_MAX_LENGTH },
      });
    });
  });

  it('caps the title and the description at the lengths the server enforces', () => {
    expect(validateChunkForm({ ...valid, title: 'A'.repeat(CHUNK_TITLE_MAX_LENGTH) })).toBeNull();
    expect(validateChunkForm({ ...valid, title: 'A'.repeat(CHUNK_TITLE_MAX_LENGTH + 1) })).toEqual({
      field: 'title',
      key: 'errors.titleTooLong',
      values: { max: CHUNK_TITLE_MAX_LENGTH },
    });

    expect(
      validateChunkForm({ ...valid, description: 'd'.repeat(CHUNK_DESCRIPTION_MAX_LENGTH) })
    ).toBeNull();
    expect(
      validateChunkForm({ ...valid, description: 'd'.repeat(CHUNK_DESCRIPTION_MAX_LENGTH + 1) })
    ).toEqual({
      field: 'description',
      key: 'errors.descriptionTooLong',
      values: { max: CHUNK_DESCRIPTION_MAX_LENGTH },
    });
  });

  // Trailing whitespace is trimmed before every rule, exactly as the
  // server does — a slug typed with a stray space is valid, not malformed.
  it('trims before judging', () => {
    expect(validateChunkForm({ ...valid, slug: '  fianchetto  ' })).toBeNull();
    expect(validateChunkForm({ ...valid, title: '  Fianchetto  ' })).toBeNull();
  });
});
