import { StrictMode } from 'react';

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastContainer } from './ToastContainer';

const mockShowToast = vi.fn();
const mockReplace = vi.fn();
const mockPush = vi.fn();

// Mirrors the App Router's own behaviour: the value's identity is tied to the
// URL, so a re-render alone does not re-run effects that depend on it.
let searchParamsCache = new URLSearchParams();
function setUrl(url: string) {
  window.history.replaceState(null, '', url);
  searchParamsCache = new URLSearchParams(window.location.search);
}

vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en' }),
  usePathname: () => window.location.pathname,
  useSearchParams: () => searchParamsCache,
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

// Pulled in by ToastItem; loading the real module would resolve next-intl's
// client navigation against the mocked `next/navigation` above.
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

vi.mock('@/i18n/use-safe-translations');

vi.mock('../_contexts/ToastContext', () => ({
  useToast: () => ({ toasts: [], hideToast: vi.fn(), showToast: mockShowToast }),
}));

describe('ToastContainer query-param toasts', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setUrl('/en/repertoires/r1/lines/1');
  });

  it('shows the toast once and strips the param synchronously', () => {
    setUrl('/en/repertoires/r1/lines/1?toast=line_updated');
    render(<ToastContainer />);

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith('lineUpdated', 'success');
    // Synchronous — a component that rebuilds the URL right after this must not
    // be able to read (and write back) the already-consumed param.
    expect(window.location.search).toBe('');
  });

  it('keeps unrelated params while dropping the consumed one', () => {
    setUrl('/en/repertoires/r1/lines/1?move=3&toast=line_added');
    render(<ToastContainer />);

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe('?move=3');
  });

  it('strips via history.replaceState, not a router soft navigation', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    setUrl('/en/repertoires/r1/lines/1?toast=line_updated');
    replaceState.mockClear();

    render(<ToastContainer />);

    // `null` state, so the App Router's replaceState patch treats it as an
    // external call and refreshes usePathname/useSearchParams.
    expect(replaceState).toHaveBeenCalledWith(null, '', '/en/repertoires/r1/lines/1');
    // A soft navigation would re-fetch the RSC payload and leave the param
    // readable for the length of that round-trip.
    expect(mockReplace).not.toHaveBeenCalled();
    replaceState.mockRestore();
  });

  it('leaves the URL alone for an unknown toast key', () => {
    setUrl('/en/repertoires/r1/lines/1?toast=not_a_real_key');
    render(<ToastContainer />);

    expect(mockShowToast).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?toast=not_a_real_key');
  });

  // StrictMode runs every effect twice on mount, against the same render's
  // `searchParams` — so an effect that trusts that snapshot re-shows a toast
  // it already consumed. This was visible on every `?toast=` navigation in
  // `next dev`; production React never double-invokes, which is the only
  // reason it stayed a local-only symptom.
  it('shows the toast once when the effect runs twice on mount', () => {
    setUrl('/en/mypage?toast=login_success');
    render(
      <StrictMode>
        <ToastContainer />
      </StrictMode>
    );

    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe('');
  });
});
