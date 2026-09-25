import { describe, expect, it, vi } from 'vitest';

import { buildPgnAttachmentValues } from './build-pgn-attachment-values';

// The Lichess branch reads through the DB cache; a pasted PGN never reaches it.
vi.mock('@/lib/games/resolve-lichess-attachment', () => ({
  resolveLichessAttachmentPgn: vi.fn(),
}));

function pgnWithHeaders(headers: Record<string, string>): string {
  const tags = Object.entries(headers)
    .map(([name, value]) => `[${name} "${value}"]`)
    .join('\n');
  return `${tags}\n\n1. e4 e5 2. Nf3 Nc6 *`;
}

describe('buildPgnAttachmentValues — header column widths', () => {
  it('cuts each header to the width of the column it is stored in', async () => {
    const result = await buildPgnAttachmentValues(
      pgnWithHeaders({
        Event: 'e'.repeat(250),
        Site: 's'.repeat(250),
        Date: '2024.01.01 '.repeat(4),
        White: 'w'.repeat(150),
        Black: 'b'.repeat(150),
        Result: '*',
      }),
      { anonymize: false }
    );

    if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
    // Column widths from post_game_pgn_attachments: a longer value is rejected
    // by Postgres with 22001 at INSERT rather than truncated.
    expect(result.values.headerWhite).toHaveLength(100);
    expect(result.values.headerBlack).toHaveLength(100);
    expect(result.values.headerEvent).toHaveLength(200);
    expect(result.values.headerSite).toHaveLength(200);
    expect(result.values.headerDate?.length).toBeLessThanOrEqual(20);
    expect(result.values.headerResult).toBe('*');
  });

  it('leaves headers that fit their column untouched', async () => {
    const result = await buildPgnAttachmentValues(
      pgnWithHeaders({ White: 'Carlsen, Magnus', Black: 'Nakamura, Hikaru', Date: '2024.01.01' }),
      { anonymize: false }
    );

    if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
    expect(result.values.headerWhite).toBe('Carlsen, Magnus');
    expect(result.values.headerBlack).toBe('Nakamura, Hikaru');
    expect(result.values.headerDate).toBe('2024.01.01');
  });
});
