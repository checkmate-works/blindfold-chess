import { describe, expect, it } from 'vitest';

import { planPostEdit } from './post-edit-plan';

const opening = { topicType: 'opening', content: 'old', isSpoiler: false };
const puzzle = { topicType: 'position_puzzle', content: 'old', isSpoiler: false };

describe('planPostEdit', () => {
  it('returns null when nothing changes', () => {
    expect(planPostEdit(opening, { content: 'old', isSpoilerChecked: false })).toBeNull();
  });

  it('records a content change', () => {
    expect(planPostEdit(opening, { content: 'new', isSpoilerChecked: false })).toEqual({
      content: 'new',
      isSpoiler: false,
      changes: { content: { from: 'old', to: 'new' } },
    });
  });

  it('ignores the spoiler flag outside position_puzzle', () => {
    expect(planPostEdit(opening, { content: 'old', isSpoilerChecked: true })).toBeNull();
    expect(
      planPostEdit({ ...opening, isSpoiler: true }, { content: 'new', isSpoilerChecked: false })
    ).toMatchObject({ isSpoiler: true, changes: { content: { from: 'old', to: 'new' } } });
  });

  it('records a spoiler toggle on position_puzzle', () => {
    expect(planPostEdit(puzzle, { content: 'old', isSpoilerChecked: true })).toEqual({
      content: 'old',
      isSpoiler: true,
      changes: { isSpoiler: { from: false, to: true } },
    });
  });

  it('records both fields when both change', () => {
    expect(planPostEdit(puzzle, { content: 'new', isSpoilerChecked: true })?.changes).toEqual({
      content: { from: 'old', to: 'new' },
      isSpoiler: { from: false, to: true },
    });
  });
});
