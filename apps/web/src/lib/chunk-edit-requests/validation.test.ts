import { describe, expect, it } from 'vitest';

import {
  CHUNK_EDIT_REQUEST_COMMENT_MAX_LENGTH,
  CHUNK_EDIT_REQUEST_DESCRIPTION_MAX_LENGTH,
  isChunkEditRequestStatus,
  parseResolverComment,
  validateSubmitEditRequest,
} from './validation';

const CURRENT = { title: 'Fianchetto', description: 'Bishop on long diagonal' };

describe('isChunkEditRequestStatus', () => {
  it.each(['pending', 'accepted', 'rejected', 'withdrawn'])('accepts %s', (s) => {
    expect(isChunkEditRequestStatus(s)).toBe(true);
  });

  it.each(['', 'open', 'closed', 'PENDING', null, undefined, 0, {}])('rejects %s', (s) => {
    expect(isChunkEditRequestStatus(s)).toBe(false);
  });
});

describe('validateSubmitEditRequest', () => {
  it('rejects when neither field is supplied', () => {
    const result = validateSubmitEditRequest({}, CURRENT);
    expect(result).toMatch(/at least one of title or description/i);
  });

  it('rejects when proposed title is identical to current', () => {
    const result = validateSubmitEditRequest({ proposedTitle: 'Fianchetto' }, CURRENT);
    expect(result).toMatch(/identical to the current title/i);
  });

  it('rejects when proposed description is identical to current', () => {
    const result = validateSubmitEditRequest(
      { proposedDescription: 'Bishop on long diagonal' },
      CURRENT
    );
    expect(result).toMatch(/identical to the current description/i);
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
    expect(result).toMatch(/characters or fewer/i);
  });

  it('rejects an over-length proposed description', () => {
    const result = validateSubmitEditRequest(
      { proposedDescription: 'a'.repeat(CHUNK_EDIT_REQUEST_DESCRIPTION_MAX_LENGTH + 1) },
      CURRENT
    );
    expect(result).toMatch(/characters or fewer/i);
  });

  it('rejects an over-length comment even when other fields are valid', () => {
    const result = validateSubmitEditRequest(
      {
        proposedTitle: 'Kingside fianchetto',
        comment: 'x'.repeat(CHUNK_EDIT_REQUEST_COMMENT_MAX_LENGTH + 1),
      },
      CURRENT
    );
    expect(result).toMatch(/comment must be/i);
  });

  it('trims the proposed title and treats trimmed-equal-to-current as no-op', () => {
    const result = validateSubmitEditRequest({ proposedTitle: '  Fianchetto  ' }, CURRENT);
    expect(result).toMatch(/identical to the current title/i);
  });

  it('normalizes whitespace-only description to null and rejects against a null current description', () => {
    // The proposer typed only whitespace and the current description is
    // already empty — the normalized values match, so the "no-op
    // suggestion" guard fires the identical-to-current error.
    const result = validateSubmitEditRequest(
      { proposedDescription: '   ' },
      { title: 'X', description: null }
    );
    expect(result).toMatch(/identical to the current description/i);
  });
});

describe('parseResolverComment', () => {
  it('returns null for undefined / empty / whitespace', () => {
    expect(parseResolverComment(undefined)).toEqual({ ok: true, value: null });
    expect(parseResolverComment(null)).toEqual({ ok: true, value: null });
    expect(parseResolverComment('   ')).toEqual({ ok: true, value: null });
  });

  it('trims a non-empty comment', () => {
    expect(parseResolverComment('  hello  ')).toEqual({ ok: true, value: 'hello' });
  });

  it('returns an error for over-length comments', () => {
    const result = parseResolverComment('x'.repeat(CHUNK_EDIT_REQUEST_COMMENT_MAX_LENGTH + 1));
    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/characters or fewer/i),
    });
  });
});
