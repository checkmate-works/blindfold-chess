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

  it('reports the first failing rule in gate order', () => {
    expect(validateChunkForm({ ...valid, isFenValid: false, title: ' ' })).toBe(
      'errors.invalidFen'
    );
    expect(validateChunkForm({ ...valid, title: '  ' })).toBe('errors.titleRequired');
    expect(validateChunkForm({ ...valid, slug: '' })).toBe('errors.slugRequired');
  });

  it('requires a description only when publishing on creation', () => {
    expect(validateChunkForm({ ...valid, description: '' })).toBe('errors.descriptionRequired');
    expect(validateChunkForm({ ...valid, status: 'draft', description: '' })).toBeNull();
  });
});
