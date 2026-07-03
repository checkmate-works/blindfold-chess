import { describe, expect, it } from 'vitest';

import { validateChunkCreateForm } from './chunk-form-validation';

const valid = {
  isFenValid: true,
  title: 'Fianchetto',
  slug: 'fianchetto',
  status: 'published',
  description: 'Bishop on the long diagonal.',
} as const;

describe('validateChunkCreateForm', () => {
  it('passes a complete form', () => {
    expect(validateChunkCreateForm(valid)).toBeNull();
  });

  it('reports the first failing rule in gate order', () => {
    expect(validateChunkCreateForm({ ...valid, isFenValid: false, title: ' ' })).toBe(
      'errors.invalidFen'
    );
    expect(validateChunkCreateForm({ ...valid, title: '  ' })).toBe('errors.titleRequired');
    expect(validateChunkCreateForm({ ...valid, slug: '' })).toBe('errors.slugRequired');
  });

  it('requires a description only when publishing on creation', () => {
    expect(validateChunkCreateForm({ ...valid, description: '' })).toBe(
      'errors.descriptionRequired'
    );
    expect(validateChunkCreateForm({ ...valid, status: 'draft', description: '' })).toBeNull();
  });
});
