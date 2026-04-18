import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSearchParamState } from './useSearchParamState';

const mockReplace = vi.fn();
let currentSearchParams = new URLSearchParams();
const mockPathname = '/test-path';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
  useSearchParams: () => currentSearchParams,
}));

describe('useSearchParamState', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    currentSearchParams = new URLSearchParams();
  });

  describe('parser composition', () => {
    it('parses an absent param via parser receiving null', () => {
      const parser = vi.fn((raw: string | null) => raw ?? 'fallback');
      const { result } = renderHook(() => useSearchParamState('page', parser));

      expect(parser).toHaveBeenCalledWith(null);
      expect(result.current[0]).toBe('fallback');
    });

    it('passes the raw string to the parser when the param is present', () => {
      currentSearchParams = new URLSearchParams('?page=42');
      const parser = vi.fn((raw: string | null) => (raw ? parseInt(raw, 10) : 0));
      const { result } = renderHook(() => useSearchParamState('page', parser));

      expect(parser).toHaveBeenCalledWith('42');
      expect(result.current[0]).toBe(42);
    });

    it('supports enum/union parsers with narrowing', () => {
      currentSearchParams = new URLSearchParams('?sort=desc');
      const parser = (raw: string | null): 'asc' | 'desc' => (raw === 'desc' ? 'desc' : 'asc');

      const { result } = renderHook(() => useSearchParamState('sort', parser));
      expect(result.current[0]).toBe('desc');
    });

    it('supports boolean parsers', () => {
      currentSearchParams = new URLSearchParams('?flag=1');
      const parser = (raw: string | null) => raw === '1';

      const { result } = renderHook(() => useSearchParamState('flag', parser));
      expect(result.current[0]).toBe(true);
    });
  });

  describe('setter', () => {
    it('writes via router.replace with scroll: false', () => {
      const { result } = renderHook(() =>
        useSearchParamState('page', (raw) => (raw ? parseInt(raw, 10) : 1))
      );

      act(() => {
        result.current[1](3);
      });

      expect(mockReplace).toHaveBeenCalledWith('/test-path?page=3', { scroll: false });
    });

    it('preserves unrelated existing params when updating', () => {
      currentSearchParams = new URLSearchParams('?other=keep&page=1');
      const { result } = renderHook(() =>
        useSearchParamState('page', (raw) => (raw ? parseInt(raw, 10) : 1))
      );

      act(() => {
        result.current[1](5);
      });

      const [[url]] = mockReplace.mock.calls;
      expect(url).toContain('other=keep');
      expect(url).toContain('page=5');
    });

    it('removes the key when serializer returns null', () => {
      currentSearchParams = new URLSearchParams('?page=3');
      const { result } = renderHook(() =>
        useSearchParamState<number | null>(
          'page',
          (raw) => (raw ? parseInt(raw, 10) : null),
          (value) => (value === null ? null : String(value))
        )
      );

      act(() => {
        result.current[1](null);
      });

      expect(mockReplace).toHaveBeenCalledWith('/test-path', { scroll: false });
    });

    it('removes the key via default serializer when value is null/undefined', () => {
      currentSearchParams = new URLSearchParams('?flag=1');
      const { result } = renderHook(() => useSearchParamState<string | null>('flag', (raw) => raw));

      act(() => {
        result.current[1](null);
      });

      expect(mockReplace).toHaveBeenCalledWith('/test-path', { scroll: false });
    });

    it('uses default String() serializer when none provided', () => {
      const { result } = renderHook(() =>
        useSearchParamState('count', (raw) => (raw ? parseInt(raw, 10) : 0))
      );

      act(() => {
        result.current[1](7);
      });

      expect(mockReplace).toHaveBeenCalledWith('/test-path?count=7', { scroll: false });
    });
  });

  describe('round-trip', () => {
    it('parser(serializer(value)) yields the original value', () => {
      const parser = (raw: string | null) => (raw ? parseInt(raw, 10) : 0);
      const serializer = (value: number) => String(value);

      for (const v of [0, 1, 42, 999]) {
        expect(parser(serializer(v))).toBe(v);
      }
    });
  });
});
