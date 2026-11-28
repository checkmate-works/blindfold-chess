import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { TagPicker } from './TagPicker';

vi.mock('@/lib/positions/ui/ThemedBoardThumbnail', () => ({
  ThemedBoardThumbnail: () => <div data-testid="board" />,
}));
// The detail modal links into the glossary through next-intl navigation,
// which does not resolve under jsdom; it is not what these tests exercise.
vi.mock('./TagDetailModal', () => ({ TagDetailModal: () => null }));

const themes: ThemeOption[] = [
  {
    id: 't-pin',
    slug: 'pin',
    label: 'Pin',
    category: 'tactics',
    previewFen: null,
    definition: null,
    reading: null,
    positions: [],
  },
  {
    id: 't-fork',
    slug: 'fork',
    label: 'Fork',
    category: 'tactics',
    previewFen: null,
    definition: null,
    reading: null,
    positions: [],
  },
];
const chunks: ChunkOption[] = [];

const labels = {
  section: 'Themes & chunks',
  placeholder: 'Search',
  badgeTheme: 'Theme',
  badgeChunk: 'Chunk',
  noResults: 'No matches',
  remove: (l: string) => `Remove ${l}`,
  openDetail: (l: string) => `Show details for ${l}`,
  moreItemsHint: (n: number) => `+${n} more`,
  detail: {
    readingPrefix: '',
    noDescription: '',
    viewInGlossary: '',
    viewChunkPage: '',
    detach: '',
    close: '',
  },
};

function renderPicker(onChange = vi.fn()) {
  render(
    <TagPicker
      selectedThemes={[]}
      selectedChunks={[]}
      availableThemes={themes}
      availableChunks={chunks}
      onChange={onChange}
      labels={labels}
    />
  );
  return screen.getByPlaceholderText('Search') as HTMLInputElement;
}

/**
 * Records every value React writes into the DOM input. A controlled input
 * whose `value` lags one render behind the keystroke gets the previous text
 * written back into it right after the change event; on iOS WebKit that
 * write tears the predictive-text session apart (doubled characters, dead
 * Backspace). The assertion is that the field is never rewound.
 */
function trackValueWrites(input: HTMLInputElement): string[] {
  const writes: string[] = [];
  const proto = Object.getPrototypeOf(input) as HTMLInputElement;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value')!;
  Object.defineProperty(input, 'value', {
    configurable: true,
    get() {
      return desc.get!.call(this);
    },
    set(v: string) {
      writes.push(v);
      desc.set!.call(this, v);
    },
  });
  return writes;
}

describe('TagPicker search input', () => {
  it('never writes a stale value back into the field while typing or deleting', () => {
    const input = renderPicker();
    fireEvent.focus(input);
    const writes = trackValueWrites(input);

    fireEvent.change(input, { target: { value: 'f' } });
    fireEvent.change(input, { target: { value: 'fo' } });
    fireEvent.change(input, { target: { value: 'f' } });

    // Only the values the user produced — no rewinds to an earlier text.
    expect(writes.filter((v) => !['f', 'fo'].includes(v))).toEqual([]);
    expect(input.value).toBe('f');
    expect(screen.getByText('Fork')).toBeInTheDocument();
    expect(screen.queryByText('Pin')).not.toBeInTheDocument();
  });

  it('adds the picked item and clears the query', () => {
    const onChange = vi.fn();
    const input = renderPicker(onChange);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'pi' } });
    fireEvent.click(screen.getByText('Pin'));

    expect(onChange).toHaveBeenCalledWith([themes[0]], []);
    expect(input.value).toBe('');
  });
});
