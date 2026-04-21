import { describe, expect, it } from 'vitest';

import type { MoveInputPreferenceHint } from '@/lib/games/move-input-cookie';
import type { PeekPreferenceHint } from '@/lib/games/peek-cookie';

import {
  deriveMoveInputSkeletonProps,
  shouldShowInlinePeekHeader,
  shouldShowModalPeekButton,
} from './preferences';

describe('shouldShowModalPeekButton', () => {
  it('returns false when peekMode is "inline" regardless of showBoardButtonInGame', () => {
    expect(shouldShowModalPeekButton({ peekMode: 'inline', showBoardButtonInGame: true })).toBe(
      false
    );
    expect(shouldShowModalPeekButton({ peekMode: 'inline', showBoardButtonInGame: false })).toBe(
      false
    );
  });

  it('returns true when peekMode is "modal" AND showBoardButtonInGame is true', () => {
    expect(shouldShowModalPeekButton({ peekMode: 'modal', showBoardButtonInGame: true })).toBe(
      true
    );
  });

  it('returns false when peekMode is "modal" but showBoardButtonInGame is false', () => {
    expect(shouldShowModalPeekButton({ peekMode: 'modal', showBoardButtonInGame: false })).toBe(
      false
    );
  });

  it('accepts a PeekPreferenceHint (cookie-sourced) shape', () => {
    const hint: PeekPreferenceHint = { peekMode: 'modal', showBoardButtonInGame: true };
    expect(shouldShowModalPeekButton(hint)).toBe(true);
  });
});

describe('shouldShowInlinePeekHeader', () => {
  it('returns false when peekMode is "modal" regardless of showBoardButtonInGame', () => {
    expect(shouldShowInlinePeekHeader({ peekMode: 'modal', showBoardButtonInGame: true })).toBe(
      false
    );
    expect(shouldShowInlinePeekHeader({ peekMode: 'modal', showBoardButtonInGame: false })).toBe(
      false
    );
  });

  it('returns true when peekMode is "inline" AND showBoardButtonInGame is true', () => {
    expect(shouldShowInlinePeekHeader({ peekMode: 'inline', showBoardButtonInGame: true })).toBe(
      true
    );
  });

  it('returns false when peekMode is "inline" but showBoardButtonInGame is false', () => {
    expect(shouldShowInlinePeekHeader({ peekMode: 'inline', showBoardButtonInGame: false })).toBe(
      false
    );
  });

  it('accepts a PeekPreferenceHint (cookie-sourced) shape', () => {
    const hint: PeekPreferenceHint = { peekMode: 'inline', showBoardButtonInGame: true };
    expect(shouldShowInlinePeekHeader(hint)).toBe(true);
  });
});

describe('symmetry: exactly one of shouldShow{Inline,Modal}Peek* is true when the button is enabled', () => {
  // When `showBoardButtonInGame` is true, exactly one peek rendering path is
  // active (modal button OR inline header — never both, never neither). This
  // mutually-exclusive contract is what keeps SSR skeleton shapes aligned
  // with post-hydration rendering.
  it.each(['modal', 'inline'] as const)(
    'peekMode=%s with showBoardButtonInGame=true yields exactly one active branch',
    (peekMode) => {
      const input = { peekMode, showBoardButtonInGame: true } as const;
      const modal = shouldShowModalPeekButton(input);
      const inline = shouldShowInlinePeekHeader(input);
      expect(modal !== inline).toBe(true);
    }
  );

  it.each(['modal', 'inline'] as const)(
    'peekMode=%s with showBoardButtonInGame=false yields neither branch',
    (peekMode) => {
      const input = { peekMode, showBoardButtonInGame: false } as const;
      expect(shouldShowModalPeekButton(input)).toBe(false);
      expect(shouldShowInlinePeekHeader(input)).toBe(false);
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
    // Mode selection is the hint's concern (coerced at parse time); the
    // derivation step is a pure pass-through. Verify for each mode value.
    const modes = ['button', 'text', 'select'] as const;
    for (const mode of modes) {
      const props = deriveMoveInputSkeletonProps({ mode, enabledModes: [mode] });
      expect(props.mode).toBe(mode);
    }
  });

  it('treats enabledModes.length === 2 as the inclusive boundary for the switch row', () => {
    // The skeleton reserves a mode-switch row when 2+ modes are enabled. Pin
    // the boundary value so a future off-by-one (`> 2` vs `>= 2`) regression
    // is caught here and not only in visual diffs.
    expect(
      deriveMoveInputSkeletonProps({ mode: 'text', enabledModes: ['text', 'button'] }).hasModeSwitch
    ).toBe(true);
    expect(
      deriveMoveInputSkeletonProps({ mode: 'button', enabledModes: ['button'] }).hasModeSwitch
    ).toBe(false);
  });
});
