import { NextIntlClientProvider } from 'next-intl';

import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import enMessages from '@/messages/en.json';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AttachmentAddButton } from './AttachmentAddButton';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/lib/positions/ui/MiniBoard', () => ({
  MiniBoard: ({ fen }: { fen: string }) => <div data-testid="mini-board" data-fen={fen} />,
}));

const PGN_SAMPLE = '[Event "Test"]\n[White "A"]\n[Black "B"]\n\n1. e4 e5';

/**
 * Render the button, open the modal, paste a PGN and apply — the path that
 * reaches the attach action and, on failure, its error message.
 */
async function attachPgnAndFail(error: string) {
  const attachPgnAction = vi.fn().mockResolvedValue({ error });
  render(
    <NextIntlClientProvider
      locale="en"
      messages={enMessages as unknown as Record<string, unknown>}
      timeZone="UTC"
    >
      <IntlAvailableContext.Provider value={true}>
        <AttachmentAddButton postId="post-1" locale="en" attachPgnAction={attachPgnAction} />
      </IntlAvailableContext.Provider>
    </NextIntlClientProvider>
  );

  fireEvent.click(screen.getByRole('button', { name: /Add attachment/i }));
  const textarea = document.querySelector('#attachmentPgn') as HTMLTextAreaElement;
  fireEvent.change(textarea, { target: { value: PGN_SAMPLE } });
  const applyBtn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent === 'Apply'
  ) as HTMLButtonElement;
  fireEvent.click(applyBtn);

  await waitFor(() => expect(attachPgnAction).toHaveBeenCalledTimes(1));
}

describe('AttachmentAddButton — attach failure messages', () => {
  // The action answers with fully-qualified keys; resolving them only against
  // `topics.addAttachment` used to collapse every cause into "Could not attach".
  it('shows the specific reason for a PGN the parser rejected', async () => {
    await attachPgnAndFail('attachment.error.invalidPgn');

    await waitFor(() =>
      expect(
        screen.getByText('Could not parse that as a PGN. Check the moves and headers.')
      ).toBeTruthy()
    );
  });

  it('shows the specific reason for an oversized PGN', async () => {
    await attachPgnAndFail('attachment.error.tooLarge');

    await waitFor(() =>
      expect(screen.getByText('PGN is too large. The maximum size is 100 KB.')).toBeTruthy()
    );
  });

  it('still resolves the page-local keys the action can also return', async () => {
    await attachPgnAndFail('unauthorized');

    await waitFor(() =>
      expect(screen.getByText('You can only attach to your own posts.')).toBeTruthy()
    );
  });

  it('falls back to the generic message for a key nothing defines', async () => {
    await attachPgnAndFail('something.nobody.translated');

    await waitFor(() =>
      expect(screen.getByText('Could not attach. Please try again.')).toBeTruthy()
    );
  });
});
