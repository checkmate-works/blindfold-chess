import * as matchers from '@testing-library/jest-dom/matchers';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EmailCard } from './EmailCard';

expect.extend(matchers);

const mockShowToast = vi.fn();
const mockReplace = vi.fn();
const mockRequestEmailChange = vi.fn();

vi.mock('@/i18n/use-safe-translations');
vi.mock('@/i18n/use-safe-locale', () => ({ useSafeLocale: () => 'ja' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace }) }));
vi.mock('@/app/[locale]/_contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));
vi.mock('../_actions/requestEmailChange', () => ({
  requestEmailChange: (...args: unknown[]) => mockRequestEmailChange(...args),
}));

function openAndSubmit(newEmail: string) {
  fireEvent.click(screen.getByRole('button', { name: 'change' }));
  fireEvent.change(screen.getByLabelText('newEmailLabel'), { target: { value: newEmail } });
  fireEvent.submit(screen.getByRole('button', { name: 'submit' }));
}

describe('EmailCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestEmailChange.mockResolvedValue({ success: true });
  });

  it('shows the address, the pending line when a change is waiting, and opens the form inline', () => {
    render(<EmailCard email="me@example.com" pendingEmail="new@example.com" />);

    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('pending');
    expect(screen.queryByLabelText('newEmailLabel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'change' }));
    expect(screen.getByLabelText('newEmailLabel')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'change' })).not.toBeInTheDocument();
  });

  it('sends the request, toasts, closes the form and reloads the page without a notice', async () => {
    render(<EmailCard email="me@example.com" pendingEmail={undefined} />);

    openAndSubmit('new@example.com');

    await waitFor(() => expect(mockRequestEmailChange).toHaveBeenCalledWith('new@example.com'));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('sentToast', 'success'));
    expect(mockReplace).toHaveBeenCalledWith('/ja/mypage/account');
    expect(screen.queryByLabelText('newEmailLabel')).not.toBeInTheDocument();
  });

  it('shows an action error at the field and keeps the form open', async () => {
    mockRequestEmailChange.mockResolvedValue({ error: 'emailUnavailable' });
    render(<EmailCard email="me@example.com" pendingEmail={undefined} />);

    openAndSubmit('taken@example.com');

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('errors.emailUnavailable')
    );
    expect(screen.getByLabelText('newEmailLabel')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('cancelling clears the typed address and the error', async () => {
    mockRequestEmailChange.mockResolvedValue({ error: 'sameEmail' });
    render(<EmailCard email="me@example.com" pendingEmail={undefined} />);

    openAndSubmit('me@example.com');
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'change' }));

    expect(screen.getByLabelText('newEmailLabel')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
