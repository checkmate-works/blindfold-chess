import { describe, expect, it } from 'vitest';

import type { MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';
import type { PeekPreferenceHint } from '@/lib/games/peek-cookie';

import {
  deriveMoveInputSkeletonProps,
  shouldShowAlwaysVisibleBoard,
  shouldShowInlinePeekHeader,
  shouldShowModalPeekButton,
} from './preferences';

describe('shouldShowModalPeekButton', () => {
  it('returns false when peekMode is "inline" regardless of boardVisibility', () => {
    expect(shouldShowModalPeekButton({ peekMode: 'inline', boardVisibility: 'peek' })).toBe(false);
    expect(shouldShowModalPeekButton({ peekMode: 'inline', boardVisibility: 'never' })).toBe(false);
    expect(shouldShowModalPeekButton({ peekMode: 'inline', boardVisibility: 'always' })).toBe(
      false
    );
  });

  it('returns true when peekMode is "modal" AND boardVisibility is "peek"', () => {
    expect(shouldShowModalPeekButton({ peekMode: 'modal', boardVisibility: 'peek' })).toBe(true);
  });

  it('returns false when peekMode is "modal" but boardVisibility is "never"', () => {
    expect(shouldShowModalPeekButton({ peekMode: 'modal', boardVisibility: 'never' })).toBe(false);
  });

  it('returns false when boardVisibility is "always" (board is on-screen; button irrelevant)', () => {
    expect(shouldShowModalPeekButton({ peekMode: 'modal', boardVisibility: 'always' })).toBe(false);
  });

  it('accepts a PeekPreferenceHint (cookie-sourced) shape', () => {
    const hint: PeekPreferenceHint = { peekMode: 'modal', boardVisibility: 'peek' };
    expect(shouldShowModalPeekButton(hint)).toBe(true);
  });
});

describe('shouldShowInlinePeekHeader', () => {
  it('returns false when peekMode is "modal" regardless of boardVisibility', () => {
    expect(shouldShowInlinePeekHeader({ peekMode: 'modal', boardVisibility: 'peek' })).toBe(false);
    expect(shouldShowInlinePeekHeader({ peekMode: 'modal', boardVisibility: 'never' })).toBe(false);
    expect(shouldShowInlinePeekHeader({ peekMode: 'modal', boardVisibility: 'always' })).toBe(
      false
    );
  });

  it('returns true when peekMode is "inline" AND boardVisibility is "peek"', () => {
    expect(shouldShowInlinePeekHeader({ peekMode: 'inline', boardVisibility: 'peek' })).toBe(true);
  });

  it('returns false when peekMode is "inline" but boardVisibility is "never"', () => {
    expect(shouldShowInlinePeekHeader({ peekMode: 'inline', boardVisibility: 'never' })).toBe(
      false
    );
  });

  it('returns false when boardVisibility is "always" (different rendering path)', () => {
    // 'always' has its own predicate (shouldShowAlwaysVisibleBoard); the
    // collapsible inline-peek header is not rendered in that mode.
    expect(shouldShowInlinePeekHeader({ peekMode: 'inline', boardVisibility: 'always' })).toBe(
      false
    );
  });

  it('accepts a PeekPreferenceHint (cookie-sourced) shape', () => {
    const hint: PeekPreferenceHint = { peekMode: 'inline', boardVisibility: 'peek' };
    expect(shouldShowInlinePeekHeader(hint)).toBe(true);
  });
});

describe('shouldShowAlwaysVisibleBoard', () => {
  it('returns true when boardVisibility is "always" regardless of peekMode', () => {
    expect(shouldShowAlwaysVisibleBoard({ peekMode: 'modal', boardVisibility: 'always' })).toBe(
      true
    );
    expect(shouldShowAlwaysVisibleBoard({ peekMode: 'inline', boardVisibility: 'always' })).toBe(
      true
    );
  });

  it('returns false for any non-always visibility', () => {
    expect(shouldShowAlwaysVisibleBoard({ peekMode: 'modal', boardVisibility: 'peek' })).toBe(
      false
    );
    expect(shouldShowAlwaysVisibleBoard({ peekMode: 'inline', boardVisibility: 'never' })).toBe(
      false
    );
  });
});

describe('symmetry: at most one board-presentation predicate is true at a time', () => {
  // Across all (peekMode, boardVisibility) combinations the three predicates
  // partition the space — no two are simultaneously true. This is what keeps
  // SSR skeleton shapes aligned with post-hydration rendering.
  it.each([
    ['modal', 'always'],
    ['modal', 'peek'],
    ['modal', 'never'],
    ['inline', 'always'],
    ['inline', 'peek'],
    ['inline', 'never'],
  ] as const)(
    '(peekMode=%s, boardVisibility=%s) has ≤1 active branch',
    (peekMode, boardVisibility) => {
      const input = { peekMode, boardVisibility } as const;
      const branches = [
        shouldShowModalPeekButton(input),
        shouldShowInlinePeekHeader(input),
        shouldShowAlwaysVisibleBoard(input),
      ];
      const activeCount = branches.filter(Boolean).length;
      expect(activeCount).toBeLessThanOrEqual(1);
    }
  );
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
