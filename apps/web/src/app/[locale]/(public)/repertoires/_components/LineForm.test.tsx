import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SaveLineResult } from './LineForm';
import { LineForm } from './LineForm';

const { mockPush, mockSaveAnnotation } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSaveAnnotation: vi.fn(),
}));

vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));
vi.mock('@/i18n/use-safe-translations');
vi.mock('next-navigation-guard');

vi.mock('@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/saveAnnotation', () => ({
  saveAnnotation: mockSaveAnnotation,
}));
vi.mock(
  '@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/deleteAnnotation',
  () => ({ deleteAnnotation: vi.fn().mockResolvedValue({ ok: true }) })
);
vi.mock('@/app/[locale]/(public)/repertoires/[id]/lines/[lineNo]/_actions/saveShapes', () => ({
  saveShapes: vi.fn().mockResolvedValue({ ok: true }),
}));

// The board builder is irrelevant here and expensive to mount. This stand-in
// only reports a cursor, so a note draft can be typed under it.
vi.mock('@/app/[locale]/(public)/repertoires/_components/RepertoireBoardBuilder', () => ({
  RepertoireBoardBuilder: ({
    onCursorChange,
  }: {
    onCursorChange: (c: { positionKey: string; label: string }) => void;
  }) => (
    <button type="button" onClick={() => onCursorChange({ positionKey: 'pk1', label: '1. e4' })}>
      pick-move
    </button>
  ),
}));

function renderForm(saveLine: () => Promise<SaveLineResult>) {
  return render(
    <LineForm
      repertoireId="rep-1"
      side="white"
      initialName=""
      chapters={[]}
      initialChapterId={null}
      initialPgn="1. e4"
      initialAnnotations={{}}
      initialShapes={{}}
      cancelHref="/repertoires/rep-1"
      submitLabels={{ idle: 'Save', saving: 'Saving' }}
      saveLine={saveLine}
    />
  );
}

function submitForm(container: HTMLElement) {
  fireEvent.submit(container.querySelector('form')!);
}

/** Type a "why this move" note so the form has a note write to make on save. */
function draftNote(text: string) {
  fireEvent.click(screen.getByRole('button', { name: 'pick-move' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'line.annotation.title' }), {
    target: { value: text },
  });
}

describe('LineForm', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockSaveAnnotation.mockReset();
  });

  it('lands on the URL the save names', async () => {
    const { container } = renderForm(async () => ({ ok: true, nextHref: '/repertoires/rep-1/2' }));

    submitForm(container);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/repertoires/rep-1/2');
    });
  });

  it('keeps the submit button busy once the save lands', async () => {
    const { container } = renderForm(async () => ({ ok: true, nextHref: '/done' }));

    submitForm(container);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
    // Still mounted while the navigation resolves — the button stays busy.
    expect(container.querySelector('button[type="submit"]')).toBeDisabled();
  });

  it('reports a rejected save at the control at fault and stays on the page', async () => {
    const { container } = renderForm(async () => ({ ok: false, error: 'nameTooLong' }));

    submitForm(container);

    await waitFor(() => {
      expect(container.querySelector('#line-name')).toHaveAttribute('aria-invalid', 'true');
    });
    expect(screen.getByText('errors.nameTooLong')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(container.querySelector('button[type="submit"]')).not.toBeDisabled();
  });

  it('keeps a failed note write form-level and does not navigate', async () => {
    mockSaveAnnotation.mockResolvedValue({ ok: false });
    const { container } = renderForm(async () => ({ ok: true, nextHref: '/done' }));
    draftNote('Controls the centre.');

    submitForm(container);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('errors.generic');
    });
    expect(mockSaveAnnotation).toHaveBeenCalledWith({
      repertoireId: 'rep-1',
      positionKey: 'pk1',
      text: 'Controls the centre.',
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(container.querySelector('button[type="submit"]')).not.toBeDisabled();
  });
});
