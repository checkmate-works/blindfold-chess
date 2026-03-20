import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ResultsFilters } from './ResultsFilters';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('ResultsFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the menu select with all available menu types', () => {
    render(<ResultsFilters locale="en" availableMenuTypes={['coordinate_quiz', 'legal_moves']} />);

    const select = screen.getAllByRole('combobox')[0];
    expect(select).toBeDefined();

    // "allMenuTypes" option + 2 menu types
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(3);
  });

  it('renders without leaderboard key select when no menu is selected', () => {
    render(<ResultsFilters locale="en" availableMenuTypes={['coordinate_quiz', 'legal_moves']} />);

    // Only one select (menu type)
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(1);
  });

  it('renders leaderboard key select for coordinate_quiz', () => {
    render(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu="coordinate_quiz"
      />
    );

    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);

    // "allVariants" option + white, black, random
    const keyOptions = selects[1].querySelectorAll('option');
    expect(keyOptions).toHaveLength(4);
  });

  it('renders leaderboard key select for legal_moves', () => {
    render(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu="legal_moves"
      />
    );

    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);

    // "allVariants" option + king, queen, rook, bishop, knight, random
    const keyOptions = selects[1].querySelectorAll('option');
    expect(keyOptions).toHaveLength(7);
  });

  it('does not render leaderboard key select for menu types without keys', () => {
    render(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu={'square_colors' as never}
      />
    );

    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(1);
  });

  it('navigates to correct URL when menu is changed', () => {
    render(<ResultsFilters locale="en" availableMenuTypes={['coordinate_quiz', 'legal_moves']} />);

    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'coordinate_quiz' } });

    expect(mockPush).toHaveBeenCalledWith('/en/mypage/challenges/results?menu=coordinate_quiz');
  });

  it('navigates to URL without params when menu is cleared', () => {
    render(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu="coordinate_quiz"
      />
    );

    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: '' } });

    expect(mockPush).toHaveBeenCalledWith('/en/mypage/challenges/results');
  });

  it('navigates to correct URL when leaderboard key is changed', () => {
    render(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu="coordinate_quiz"
      />
    );

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'black' } });

    expect(mockPush).toHaveBeenCalledWith(
      '/en/mypage/challenges/results?menu=coordinate_quiz&key=black'
    );
  });

  it('navigates to URL without key param when leaderboard key is cleared', () => {
    render(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu="coordinate_quiz"
        currentKey="white"
      />
    );

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: '' } });

    expect(mockPush).toHaveBeenCalledWith('/en/mypage/challenges/results?menu=coordinate_quiz');
  });

  it('uses locale in the URL path', () => {
    render(<ResultsFilters locale="ja" availableMenuTypes={['coordinate_quiz']} />);

    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'coordinate_quiz' } });

    expect(mockPush).toHaveBeenCalledWith('/ja/mypage/challenges/results?menu=coordinate_quiz');
  });

  it('sets current menu as selected value', () => {
    render(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz', 'legal_moves']}
        currentMenu="legal_moves"
      />
    );

    const select = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    expect(select.value).toBe('legal_moves');
  });

  it('sets current key as selected value', () => {
    render(
      <ResultsFilters
        locale="en"
        availableMenuTypes={['coordinate_quiz']}
        currentMenu="coordinate_quiz"
        currentKey="black"
      />
    );

    const selects = screen.getAllByRole('combobox');
    const keySelect = selects[1] as HTMLSelectElement;
    expect(keySelect.value).toBe('black');
  });

  it('renders empty state with no available menu types', () => {
    render(<ResultsFilters locale="en" availableMenuTypes={[]} />);

    const select = screen.getAllByRole('combobox')[0];
    // Only the "allMenuTypes" option
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(1);
  });
});
