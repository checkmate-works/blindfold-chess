import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RepertoireImportForm } from './RepertoireImportForm';

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Echo the key, and answer `t.has` only for copy the message files really
// carry — that lookup is what decides whether a rejection is shown as itself
// or as the generic fallback.
vi.mock('next-intl', () => {
  const KNOWN = new Set([
    'errors.nameRequired',
    'errors.nameTooLong',
    'errors.pgnRequired',
    'errors.pgnTooLarge',
    'errors.invalidPgn',
    'errors.insufficient_balance',
    'errors.generic',
  ]);
  const t = Object.assign((key: string) => key, { has: (key: string) => KNOWN.has(key) });
  return { useTranslations: () => t };
});

vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: () => ({ active: false, accept: () => {}, reject: () => {} }),
}));

const { mockCreateRepertoire } = vi.hoisted(() => ({
  mockCreateRepertoire: vi.fn(),
}));
vi.mock('../_actions/createRepertoire', () => ({ createRepertoire: mockCreateRepertoire }));

// The board builder and the opening picker are irrelevant here and expensive
// to mount (a full chessboard, the openings master).
vi.mock('./RepertoireBoardBuilder', () => ({
  RepertoireBoardBuilder: () => <div data-testid="board-builder" />,
}));
vi.mock('./OpeningLinksField', () => ({ OpeningLinksField: () => null }));

/** The moves editor block — the section the "Moves *" label heads. */
function movesGroup(): HTMLElement {
  return screen.getByRole('group', { name: 'form.movesLabel' });
}

function submitForm(container: HTMLElement) {
  fireEvent.submit(container.querySelector('form')!);
}

function renderForm(): { container: HTMLElement } {
  return render(
    <RepertoireImportForm openings={[]} spendableBalance={0} initialName="My System" />
  );
}

describe('RepertoireImportForm', () => {
  beforeEach(() => {
    mockCreateRepertoire.mockReset();
  });
  afterEach(cleanup);

  it('reports a rejected PGN at the moves editor, not only in the form banner', async () => {
    mockCreateRepertoire.mockResolvedValue({ error: 'pgnRequired' });
    const { container } = renderForm();

    submitForm(container);

    await waitFor(() => {
      expect(movesGroup()).toHaveTextContent('errors.pgnRequired');
    });
    // The banner is for errors no control owns; this one is the moves
    // editor's, so it must not be repeated there.
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(1);
    expect(movesGroup()).toContainElement(alerts[0]!);
    // ...and the textarea is marked invalid and pointed at the explanation.
    const pgn = container.querySelector('#repertoire-pgn')!;
    expect(pgn).toHaveAttribute('aria-invalid', 'true');
    expect(pgn).toHaveAttribute('aria-describedby', 'repertoire-pgn-error');
  });

  it('reports a rejected name at the name input', async () => {
    mockCreateRepertoire.mockResolvedValue({ error: 'nameTooLong' });
    const { container } = renderForm();

    submitForm(container);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('errors.nameTooLong');
    });
    expect(container.querySelector('#repertoire-name')).toHaveAttribute('aria-invalid', 'true');
    expect(movesGroup()).not.toHaveTextContent('errors.nameTooLong');
  });

  it('leaves an error no control owns in the form banner', async () => {
    mockCreateRepertoire.mockResolvedValue({ error: 'insufficient_balance' });
    const { container } = renderForm();

    submitForm(container);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('errors.insufficient_balance');
    });
    expect(movesGroup()).not.toHaveTextContent('errors.insufficient_balance');
    expect(container.querySelector('#repertoire-pgn')).not.toHaveAttribute('aria-invalid');
  });

  it('falls back to the generic message for a rejection it has no copy for', async () => {
    mockCreateRepertoire.mockResolvedValue({ error: 'somethingNobodyPlannedFor' });
    const { container } = renderForm();

    submitForm(container);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('errors.generic');
    });
    // Unattributable by definition — it stays in the banner, off the controls.
    expect(container.querySelector('#repertoire-pgn')).not.toHaveAttribute('aria-invalid');
  });
});
