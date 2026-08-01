import { describe, expect, it } from 'vitest';

import { EDIT_REQUEST_COMMENT_MAX_LENGTH } from '@/lib/edit-requests/shared';

import { CHUNK_EDIT_REQUEST_DESCRIPTION_MAX_LENGTH, validateSubmitEditRequest } from './validation';

const CURRENT = { title: 'Fianchetto', description: 'Bishop on long diagonal' };

describe('validateSubmitEditRequest', () => {
  it('rejects when neither field is supplied', () => {
    const result = validateSubmitEditRequest({}, CURRENT);
    expect(result).toBe('nothingProposed');
  });

  it('rejects when proposed title is identical to current', () => {
    const result = validateSubmitEditRequest({ proposedTitle: 'Fianchetto' }, CURRENT);
    expect(result).toBe('titleUnchanged');
  });

  it('rejects when proposed description is identical to current', () => {
    const result = validateSubmitEditRequest(
      { proposedDescription: 'Bishop on long diagonal' },
      CURRENT
    );
    expect(result).toBe('descriptionUnchanged');
  });

  it('accepts a title-only change and leaves description absent', () => {
    const result = validateSubmitEditRequest({ proposedTitle: 'Kingside fianchetto' }, CURRENT);
    expect(result).toEqual({
      proposedTitle: 'Kingside fianchetto',
      proposedDescription: null,
      hasTitleProposal: true,
      hasDescriptionProposal: false,
      comment: null,
    });
  });

  it('accepts a description-only change and leaves title absent', () => {
    const result = validateSubmitEditRequest(
      { proposedDescription: 'Bishop developed to g2 / g7' },
      CURRENT
    );
    expect(result).toEqual({
      proposedTitle: null,
      proposedDescription: 'Bishop developed to g2 / g7',
      hasTitleProposal: false,
      hasDescriptionProposal: true,
      comment: null,
    });
  });

  it('rejects an over-length proposed title', () => {
    const result = validateSubmitEditRequest({ proposedTitle: 'a'.repeat(256) }, CURRENT);
    expect(result).toBe('titleTooLong');
  });

  it('rejects an over-length proposed description', () => {
    const result = validateSubmitEditRequest(
      { proposedDescription: 'a'.repeat(CHUNK_EDIT_REQUEST_DESCRIPTION_MAX_LENGTH + 1) },
      CURRENT
    );
    expect(result).toBe('descriptionTooLong');
  });

  it('rejects an over-length comment even when other fields are valid', () => {
    const result = validateSubmitEditRequest(
      {
        proposedTitle: 'Kingside fianchetto',
        comment: 'x'.repeat(EDIT_REQUEST_COMMENT_MAX_LENGTH + 1),
      },
      CURRENT
    );
    expect(result).toBe('commentTooLong');
  });

  it('trims the proposed title and treats trimmed-equal-to-current as no-op', () => {
    const result = validateSubmitEditRequest({ proposedTitle: '  Fianchetto  ' }, CURRENT);
    expect(result).toBe('titleUnchanged');
  });

  it('normalizes whitespace-only description to null and rejects against a null current description', () => {
    // The proposer typed only whitespace and the current description is
    // already empty — the normalized values match, so the "no-op
    // suggestion" guard fires the identical-to-current error.
    const result = validateSubmitEditRequest(
      { proposedDescription: '   ' },
      { title: 'X', description: null }
    );
    expect(result).toBe('descriptionUnchanged');
  });
});
