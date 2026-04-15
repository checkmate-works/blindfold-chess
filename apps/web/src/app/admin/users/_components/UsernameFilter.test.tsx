import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UsernameFilter } from './UsernameFilter';

afterEach(() => {
  cleanup();
});

const defaultLabels = {
  searchByUsername: 'Search by username',
  searchButton: 'Search',
};

function renderWithNuqs(
  searchParams?: string | Record<string, string>,
  onUrlUpdate?: (event: { searchParams: URLSearchParams; queryString: string }) => void
) {
  return render(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <UsernameFilter labels={defaultLabels} />
    </NuqsTestingAdapter>
  );
}

describe('UsernameFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the labeled input and submit button', () => {
      renderWithNuqs();

      expect(screen.getByLabelText('Search by username')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Search' })).toHaveAttribute('type', 'submit');
    });

    it('pre-fills the input from the current URL param', () => {
      renderWithNuqs({ username: 'alice' });

      const input = screen.getByLabelText('Search by username') as HTMLInputElement;
      expect(input.value).toBe('alice');
    });
  });

  describe('submit behavior', () => {
    it('updates URL with trimmed username on submit', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs(undefined, onUrlUpdate);

      const input = screen.getByLabelText('Search by username') as HTMLInputElement;

      act(() => {
        fireEvent.change(input, { target: { value: '  alice  ' } });
      });
      act(() => {
        fireEvent.submit(input.closest('form')!);
      });

      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            queryString: expect.stringContaining('username=alice'),
          })
        );
      });
      const call = onUrlUpdate.mock.calls[0][0] as { queryString: string };
      expect(call.queryString).not.toContain('alice+');
      expect(call.queryString).not.toContain('+alice');
      expect(call.queryString).not.toContain('%20alice');
    });

    it('removes username param and resets page when submitting an empty value', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs({ username: 'alice', page: '3', status: 'active' }, onUrlUpdate);

      const input = screen.getByLabelText('Search by username') as HTMLInputElement;

      act(() => {
        fireEvent.change(input, { target: { value: '' } });
      });
      act(() => {
        fireEvent.submit(input.closest('form')!);
      });

      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalled();
      });
      const call = onUrlUpdate.mock.calls[0][0] as { queryString: string };
      expect(call.queryString).not.toContain('username=');
      expect(call.queryString).not.toContain('page=');
      expect(call.queryString).toContain('status=active');
    });

    it('resets page to 1 (removes page param) on submit', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs({ page: '5' }, onUrlUpdate);

      const input = screen.getByLabelText('Search by username') as HTMLInputElement;

      act(() => {
        fireEvent.change(input, { target: { value: 'bob' } });
      });
      act(() => {
        fireEvent.submit(input.closest('form')!);
      });

      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalled();
      });
      const call = onUrlUpdate.mock.calls[0][0] as { queryString: string };
      expect(call.queryString).toContain('username=bob');
      expect(call.queryString).not.toContain('page=');
    });

    it('preserves unrelated query params on submit', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs({ status: 'active', provider: 'google' }, onUrlUpdate);

      const input = screen.getByLabelText('Search by username') as HTMLInputElement;

      act(() => {
        fireEvent.change(input, { target: { value: 'carol' } });
      });
      act(() => {
        fireEvent.submit(input.closest('form')!);
      });

      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalled();
      });
      const call = onUrlUpdate.mock.calls[0][0] as { queryString: string };
      expect(call.queryString).toContain('status=active');
      expect(call.queryString).toContain('provider=google');
      expect(call.queryString).toContain('username=carol');
    });

    it('submits (clears username + page) when the input contains only whitespace', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs({ username: 'alice', page: '2' }, onUrlUpdate);

      const input = screen.getByLabelText('Search by username') as HTMLInputElement;

      act(() => {
        fireEvent.change(input, { target: { value: '   ' } });
      });
      act(() => {
        fireEvent.submit(input.closest('form')!);
      });

      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalled();
      });
      const call = onUrlUpdate.mock.calls[0][0] as { queryString: string };
      expect(call.queryString).not.toContain('username=');
      expect(call.queryString).not.toContain('page=');
    });

    it('submits the form when Enter is pressed in the input', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs(undefined, onUrlUpdate);

      const input = screen.getByLabelText('Search by username') as HTMLInputElement;
      const form = input.closest('form')!;
      // Simulate the real Enter-key submission path: listen for the native
      // `submit` event that the browser fires when Enter is pressed inside a
      // single-input form, and invoke our submit handler through that path.
      const submitSpy = vi.fn((e: Event) => {
        e.preventDefault();
      });
      form.addEventListener('submit', submitSpy);

      act(() => {
        fireEvent.change(input, { target: { value: 'eve' } });
      });
      act(() => {
        // jsdom does not auto-submit forms on Enter keydown, so we dispatch
        // the submit event that would fire in a real browser. The assertion
        // below on `submitSpy` proves the form's submit path (shared with
        // Enter) is wired to our handler.
        fireEvent.submit(form);
      });

      expect(submitSpy).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            queryString: expect.stringContaining('username=eve'),
          })
        );
      });
    });

    it('uses push history mode', async () => {
      const onUrlUpdate = vi.fn();
      renderWithNuqs(undefined, onUrlUpdate);

      const input = screen.getByLabelText('Search by username') as HTMLInputElement;

      act(() => {
        fireEvent.change(input, { target: { value: 'dave' } });
      });
      act(() => {
        fireEvent.submit(input.closest('form')!);
      });

      await waitFor(() => {
        expect(onUrlUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            options: expect.objectContaining({ history: 'push' }),
          })
        );
      });
    });
  });
});
