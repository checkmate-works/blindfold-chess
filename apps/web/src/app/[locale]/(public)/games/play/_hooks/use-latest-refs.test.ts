// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useLatestRefs } from './use-latest-refs';

describe('useLatestRefs', () => {
  it('exposes the initial values immediately on first render', () => {
    const { result } = renderHook(() => useLatestRefs({ count: 1, name: 'a' }));

    expect(result.current.count.current).toBe(1);
    expect(result.current.name.current).toBe('a');
  });

  it('refreshes ref values after each render', () => {
    const { result, rerender } = renderHook((props) => useLatestRefs(props), {
      initialProps: { count: 1 },
    });

    rerender({ count: 2 });
    expect(result.current.count.current).toBe(2);

    rerender({ count: 3 });
    expect(result.current.count.current).toBe(3);
  });

  it('keeps a stable ref-bag identity across renders', () => {
    const { result, rerender } = renderHook((props) => useLatestRefs(props), {
      initialProps: { count: 1 },
    });

    const firstBag = result.current;
    const firstCountRef = result.current.count;

    rerender({ count: 2 });

    expect(result.current).toBe(firstBag);
    expect(result.current.count).toBe(firstCountRef);
  });
});
