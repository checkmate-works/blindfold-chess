import { describe, expect, it } from 'vitest';

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
});
