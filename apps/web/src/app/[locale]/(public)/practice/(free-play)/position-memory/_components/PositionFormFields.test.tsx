import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import type { TagSelection } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-tag-selection';

import { PositionFormFields } from './PositionFormFields';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/app/[locale]/_contexts/GamePreferencesContext', () => ({
  useGamePreferences: () => ({
    preferences: { boardTheme: 'monotone' },
    isLoaded: true,
  }),
}));

vi.mock('@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard', () => ({
  EditableChessBoard: ({ fen, flipped }: { fen: string; flipped?: boolean }) => (
    <div data-testid="editable-board" data-fen={fen} data-flipped={String(flipped)} />
  ),
}));

vi.mock('@/app/[locale]/(public)/practice/(free-play)/_components/TagPicker', () => ({
  TagPicker: () => <div data-testid="tag-picker" />,
}));

function renderFields(board: Partial<FenBoardEditor> = {}) {
  const handleSideToMoveChange = vi.fn();
  const setFlipped = vi.fn();

  const boardEditor = {
    fenInput: '',
    boardFen: '8/8/8/8/8/8/8/8',
    sideToMove: 'w',
    positionError: false,
    activeTab: 'board',
    flipped: false,
    isFenValid: true,
    turnIndicator: 'w',
    handleSideToMoveChange,
    setFlipped,
    setActiveTab: vi.fn(),
    handleFenInputChange: vi.fn(),
    handleBoardChange: vi.fn(),
    handleClearBoard: vi.fn(),
    ...board,
  } as unknown as FenBoardEditor;

  const tags = {
    selectedThemes: [],
    selectedChunks: [],
    handleTagChange: vi.fn(),
  } as unknown as TagSelection;

  render(
    <PositionFormFields
      board={boardEditor}
      tags={tags}
      title=""
      onTitleChange={vi.fn()}
      description=""
      onDescriptionChange={vi.fn()}
      pending={false}
      availableThemes={[]}
      availableChunks={[]}
      messageFor={() => null}
    />
  );

  return { handleSideToMoveChange, setFlipped };
}

describe('PositionFormFields', () => {
  it('rewrites the FEN side-to-move when flipping, not just the view', () => {
    // The FEN's active color IS the persisted orientation for position-memory,
    // so a flip that only re-orients the view would be discarded on save.
    const { handleSideToMoveChange, setFlipped } = renderFields({ flipped: false });

    fireEvent.click(screen.getByTitle('flipBoard'));

    expect(handleSideToMoveChange).toHaveBeenCalledWith('b');
    expect(setFlipped).toHaveBeenCalledWith(true);
  });

  it('flips back to white-to-move', () => {
    const { handleSideToMoveChange, setFlipped } = renderFields({ flipped: true });

    fireEvent.click(screen.getByTitle('flipBoard'));

    expect(handleSideToMoveChange).toHaveBeenCalledWith('w');
    expect(setFlipped).toHaveBeenCalledWith(false);
  });

  it('offers no separate side-to-move picker', () => {
    // Unlike puzzles: here the flip button is the only way to set the side,
    // so a radiogroup would be a second, conflicting control.
    renderFields();

    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('renders the title, description, board and tag picker', () => {
    renderFields();

    expect(screen.getByLabelText(/titleLabel/)).toBeTruthy();
    expect(screen.getByLabelText('descriptionLabel')).toBeTruthy();
    expect(screen.getByTestId('editable-board')).toBeTruthy();
    expect(screen.getByTestId('tag-picker')).toBeTruthy();
  });
});
