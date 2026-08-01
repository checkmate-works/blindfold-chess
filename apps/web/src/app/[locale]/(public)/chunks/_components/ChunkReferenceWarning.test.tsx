import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChunkReferenceWarning } from './ChunkReferenceWarning';

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) => {
      if (key === 'scopePositions') return `${values?.count} positions`;
      if (key === 'scopeGames') return `${values?.count} games`;
      if (key === 'scopeRepertoires') return `${values?.count} kata`;
      if (key === 'body') return `body:${values?.scope}|${values?.fields}`;
      if (key === 'separator') return ', ';
      if (key === 'hint') return 'hint';
      if (key.startsWith('fields.')) return key.slice('fields.'.length);
      return key;
    };
    return t;
  },
}));

const NONE = { positions: 0, games: 0, repertoires: 0 };

describe('ChunkReferenceWarning', () => {
  it('renders nothing when every count is zero', () => {
    render(<ChunkReferenceWarning references={NONE} changed={['title']} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders nothing when nothing identity-bearing changed, however high the counts', () => {
    render(
      <ChunkReferenceWarning references={{ positions: 3, games: 2, repertoires: 1 }} changed={[]} />
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('names a single non-zero dimension alone', () => {
    render(<ChunkReferenceWarning references={{ ...NONE, repertoires: 1 }} changed={['title']} />);
    expect(screen.getByRole('status')).toHaveTextContent('body:1 kata|title');
  });

  it('joins two non-zero dimensions with "and", omitting the zero one', () => {
    render(
      <ChunkReferenceWarning
        references={{ positions: 3, games: 0, repertoires: 1 }}
        changed={['title']}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('body:3 positions and 1 kata|title');
  });

  it('joins all three non-zero dimensions', () => {
    render(
      <ChunkReferenceWarning
        references={{ positions: 3, games: 2, repertoires: 1 }}
        changed={['title']}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'body:3 positions, 2 games, and 1 kata|title'
    );
  });

  it('joins multiple changed fields with the separator', () => {
    render(
      <ChunkReferenceWarning
        references={{ ...NONE, positions: 1 }}
        changed={['title', 'slug', 'fen']}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('body:1 positions|title, slug, fen');
  });
});
