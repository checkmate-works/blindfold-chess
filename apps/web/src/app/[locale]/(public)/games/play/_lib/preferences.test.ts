import { describe, expect, it } from 'vitest';

import type { MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';

import { deriveMoveInputSkeletonProps, shouldShowAiPulse } from './preferences';

describe('shouldShowAiPulse', () => {
  it('suppresses the pulse when the board is always visible (the move is seen directly)', () => {
    expect(shouldShowAiPulse({ boardVisibility: 'always' })).toBe(false);
  });

  it('fires the pulse in the blindfold modes (board hidden — the pulse is the cue)', () => {
    expect(shouldShowAiPulse({ boardVisibility: 'peek' })).toBe(true);
    expect(shouldShowAiPulse({ boardVisibility: 'never' })).toBe(true);
  });
});

describe('deriveMoveInputSkeletonProps', () => {
  it('returns hasModeSwitch=false when enabledModes has a single entry', () => {
    const hint: MoveInputPreferenceHint = { mode: 'button', enabledModes: ['button'] };
    expect(deriveMoveInputSkeletonProps(hint)).toEqual({
      mode: 'button',
      hasModeSwitch: false,
    });
  });

  it('returns hasModeSwitch=true when enabledModes has two entries', () => {
    const hint: MoveInputPreferenceHint = { mode: 'text', enabledModes: ['text', 'button'] };
    expect(deriveMoveInputSkeletonProps(hint)).toEqual({
      mode: 'text',
      hasModeSwitch: true,
    });
  });

  it('returns hasModeSwitch=true when enabledModes has three entries', () => {
    const hint: MoveInputPreferenceHint = {
      mode: 'select',
      enabledModes: ['button', 'select', 'text'],
    };
    expect(deriveMoveInputSkeletonProps(hint)).toEqual({
      mode: 'select',
      hasModeSwitch: true,
    });
  });

  it('mirrors the hint.mode into the skeleton props verbatim', () => {
    const modes = ['button', 'text', 'select'] as const;
    for (const mode of modes) {
      const props = deriveMoveInputSkeletonProps({ mode, enabledModes: [mode] });
      expect(props.mode).toBe(mode);
    }
  });

  it('treats enabledModes.length === 2 as the inclusive boundary for the switch row', () => {
    expect(
      deriveMoveInputSkeletonProps({ mode: 'text', enabledModes: ['text', 'button'] }).hasModeSwitch
    ).toBe(true);
    expect(
      deriveMoveInputSkeletonProps({ mode: 'button', enabledModes: ['button'] }).hasModeSwitch
    ).toBe(false);
  });
});
