import { describe, expect, it } from 'vitest';

import type { SubmitLifecycleAction, SubmitLifecycleState } from './submit-lifecycle';
import { INITIAL_SUBMIT_LIFECYCLE, isSubmitBusy, submitLifecycleReducer } from './submit-lifecycle';

const EDITING: SubmitLifecycleState = { status: 'editing' };
const CONFIRMING: SubmitLifecycleState = { status: 'confirming' };
const SUBMITTING: SubmitLifecycleState = { status: 'submitting' };
const SUCCEEDED: SubmitLifecycleState = { status: 'succeeded' };

const ALL_STATES = [EDITING, CONFIRMING, SUBMITTING, SUCCEEDED];
const ALL_ACTIONS: SubmitLifecycleAction[] = [
  { type: 'requestConfirm' },
  { type: 'cancelConfirm' },
  { type: 'submit' },
  { type: 'fail' },
  { type: 'succeed' },
];

/** Every transition the protocol allows, as `from --action--> to`. */
const LEGAL: [SubmitLifecycleState, SubmitLifecycleAction['type'], SubmitLifecycleState][] = [
  [EDITING, 'requestConfirm', CONFIRMING],
  [CONFIRMING, 'cancelConfirm', EDITING],
  [EDITING, 'submit', SUBMITTING],
  [CONFIRMING, 'submit', SUBMITTING],
  [SUBMITTING, 'fail', EDITING],
  [SUBMITTING, 'succeed', SUCCEEDED],
];

describe('submitLifecycleReducer', () => {
  it('starts in editing', () => {
    expect(INITIAL_SUBMIT_LIFECYCLE).toEqual(EDITING);
  });

  it.each(LEGAL)('%o --%s--> %o', (from, type, to) => {
    expect(submitLifecycleReducer(from, { type })).toEqual(to);
  });

  it('ignores every other action, returning the same state object', () => {
    for (const state of ALL_STATES) {
      for (const action of ALL_ACTIONS) {
        const isLegal = LEGAL.some(([from, type]) => from === state && type === action.type);
        if (isLegal) continue;
        // Same reference, not just an equal value: React bails out of the
        // re-render, so a stray dispatch is invisible.
        expect(submitLifecycleReducer(state, action), `${state.status} + ${action.type}`).toBe(
          state
        );
      }
    }
  });

  it('never leaves succeeded', () => {
    for (const action of ALL_ACTIONS) {
      expect(submitLifecycleReducer(SUCCEEDED, action)).toBe(SUCCEEDED);
    }
  });

  it('closes the confirmation as the write starts', () => {
    // The paid-tier path: confirm, then the write. The dialog must not stay
    // open over an in-flight write.
    const confirming = submitLifecycleReducer(EDITING, { type: 'requestConfirm' });
    expect(submitLifecycleReducer(confirming, { type: 'submit' })).toEqual(SUBMITTING);
  });

  it('lets the author resubmit after a rejection', () => {
    const rejected = submitLifecycleReducer(SUBMITTING, { type: 'fail' });
    expect(submitLifecycleReducer(rejected, { type: 'submit' })).toEqual(SUBMITTING);
  });
});

describe('isSubmitBusy', () => {
  it('is busy while the write is in flight and after it succeeded', () => {
    expect(isSubmitBusy(SUBMITTING)).toBe(true);
    expect(isSubmitBusy(SUCCEEDED)).toBe(true);
  });

  it('is idle while editing or confirming', () => {
    expect(isSubmitBusy(EDITING)).toBe(false);
    expect(isSubmitBusy(CONFIRMING)).toBe(false);
  });
});
