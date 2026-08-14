import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { ResultsFilters } from './ResultsFilters';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/i18n/use-safe-translations');

function renderWithProviders(ui: React.ReactElement) {
  return render(<GamePreferencesProvider>{ui}</GamePreferencesProvider>);
}

describe('ResultsFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the menu select with all available menu types', () => {
    renderWithProviders(
      <ResultsFilters locale="en" availableMenuTypes={['coordinate_quiz', 'legal_moves']} />
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeDefined();

    // "allMenuTypes" option + 2 menu types
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(3);
  });

  it('renders without orientation/piece selector when no menu is selected', () => {
    renderWithProviders(
      <ResultsFilters locale="en" availableMenuTypes={['coordinate_quiz', 'legal_moves']} />
    );

    // Only one combobox (menu type select)
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(1);
  });

  it('renders board orientation selector for coordinate_quiz', async () => {
    renderWithProviders(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu="coordinate_quiz"
      />
    );

    // BoardOrientationSelector renders buttons after isLoaded becomes true
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      // white, black, random orientation buttons
      expect(buttons).toHaveLength(3);
    });
  });

  it('renders piece selector for legal_moves', async () => {
    renderWithProviders(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu="legal_moves"
      />
    );

    // PieceSelector renders buttons: king, queen, rook, bishop, knight, random
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(6);
    });
  });

  it('does not render orientation/piece selector for menu types without keys', () => {
    renderWithProviders(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu={'square_colors' as never}
      />
    );

    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(1);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('navigates to correct URL with default key when menu is changed to coordinate_quiz', () => {
    renderWithProviders(
      <ResultsFilters locale="en" availableMenuTypes={['coordinate_quiz', 'legal_moves']} />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'coordinate_quiz' } });

    expect(mockPush).toHaveBeenCalledWith(
      '/en/mypage/challenges/results?menu=coordinate_quiz&key=white'
    );
  });

  it('navigates to correct URL with default key when menu is changed to legal_moves', () => {
    renderWithProviders(
      <ResultsFilters locale="en" availableMenuTypes={['coordinate_quiz', 'legal_moves']} />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'legal_moves' } });

    expect(mockPush).toHaveBeenCalledWith(
      '/en/mypage/challenges/results?menu=legal_moves&key=random'
    );
  });

  it('navigates to URL without params when menu is cleared', () => {
    renderWithProviders(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu="coordinate_quiz"
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '' } });

    expect(mockPush).toHaveBeenCalledWith('/en/mypage/challenges/results');
  });

  it('navigates to correct URL when board orientation is changed', async () => {
    renderWithProviders(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu="coordinate_quiz"
      />
    );

    // Wait for BoardOrientationSelector to render
    await waitFor(() => {
      expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    // Click the "black" orientation button
    const blackButton = screen.getByTitle('filters.black');
    fireEvent.click(blackButton);

    expect(mockPush).toHaveBeenCalledWith(
      '/en/mypage/challenges/results?menu=coordinate_quiz&key=black'
    );
  });

  it('navigates to correct URL when piece is selected', async () => {
    renderWithProviders(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu="legal_moves"
      />
    );

    // Wait for PieceSelector to render
    await waitFor(() => {
      expect(screen.getAllByRole('button')).toHaveLength(6);
    });

    // Click the queen button (using aria-label from getLabel)
    const queenButton = screen.getByTitle('filters.pieces.q');
    fireEvent.click(queenButton);

    expect(mockPush).toHaveBeenCalledWith(
      '/en/mypage/challenges/results?menu=legal_moves&key=queen'
    );
  });

  it('uses locale in the URL path', () => {
    renderWithProviders(<ResultsFilters locale="ja" availableMenuTypes={['coordinate_quiz']} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'coordinate_quiz' } });

    expect(mockPush).toHaveBeenCalledWith(
      '/ja/mypage/challenges/results?menu=coordinate_quiz&key=white'
    );
  });

  it('sets current menu as selected value', () => {
    renderWithProviders(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu="legal_moves"
      />
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('legal_moves');
  });

  it('renders empty state with no available menu types', () => {
    renderWithProviders(<ResultsFilters locale="en" availableMenuTypes={[]} />);

    const select = screen.getByRole('combobox');
    // Only the "allMenuTypes" option
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(1);
  });
});
