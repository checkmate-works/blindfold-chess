import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useSubmitError } from './useSubmitError';

type Field = 'title' | 'board';

/** Field → anchor id, with `board` standing in for a control that has none. */
const resolveAnchorId = (field: Field) => (field === 'title' ? 'title-input' : null);

function mountInput(id: string) {
  const el = document.createElement('input');
  el.id = id;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useSubmitError', () => {
  it('routes a field error to its control and focuses it', () => {
    const input = mountInput('title-input');
    const { result } = renderHook(() => useSubmitError<Field>(resolveAnchorId));

    act(() => result.current.report('title', 'Title is required.'));

    expect(result.current.messageFor('title')).toBe('Title is required.');
    expect(result.current.messageFor('board')).toBeNull();
    // Not the banner's business — it only carries what no control owns.
    expect(result.current.formMessage).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it('routes an unattributable error to the form-level strip and focuses it', () => {
    const { result } = renderHook(() => useSubmitError<Field>(resolveAnchorId));
    const strip = document.createElement('div');
    strip.tabIndex = -1;
    document.body.appendChild(strip);
    result.current.summaryRef.current = strip;

    act(() => result.current.report(null, 'Could not save the draft locally.'));

    expect(result.current.formMessage).toBe('Could not save the draft locally.');
    expect(result.current.messageFor('title')).toBeNull();
    expect(document.activeElement).toBe(strip);
  });

  it('leaves focus alone when the field has no anchor', () => {
    const input = mountInput('title-input');
    input.focus();
    const { result } = renderHook(() => useSubmitError<Field>(resolveAnchorId));

    act(() => result.current.report('board', 'Place a position first.'));

    expect(result.current.messageFor('board')).toBe('Place a position first.');
    expect(document.activeElement).toBe(input);
  });

  it('clears', () => {
    mountInput('title-input');
    const { result } = renderHook(() => useSubmitError<Field>(resolveAnchorId));

    act(() => result.current.report('title', 'Title is required.'));
    act(() => result.current.clear());

    expect(result.current.messageFor('title')).toBeNull();
    expect(result.current.formMessage).toBeNull();
  });
});
