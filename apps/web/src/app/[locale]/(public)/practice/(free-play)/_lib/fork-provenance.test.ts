import { describe, expect, it } from 'vitest';

import { resolveForkProvenance } from './fork-provenance';

const ID = '11111111-1111-1111-1111-111111111111';

describe('resolveForkProvenance', () => {
  it('treats a same-kind source as a plain fork', () => {
    expect(
      resolveForkProvenance({ sourceId: ID, sourceType: 'puzzle', pageType: 'puzzle' })
    ).toEqual({ isCrossType: false, href: `/practice/puzzle/${ID}` });
    expect(
      resolveForkProvenance({ sourceId: ID, sourceType: 'memory', pageType: 'memory' })
    ).toEqual({ isCrossType: false, href: `/practice/position-memory/${ID}` });
  });

  it('flags a position-memory source on the puzzle create page as cross-type', () => {
    expect(
      resolveForkProvenance({ sourceId: ID, sourceType: 'memory', pageType: 'puzzle' })
    ).toEqual({ isCrossType: true, href: `/practice/position-memory/${ID}` });
  });

  it('links to the SOURCE kind, not the page kind — routing a memory parent through the puzzle prefix would 404', () => {
    const { href } = resolveForkProvenance({
      sourceId: ID,
      sourceType: 'memory',
      pageType: 'puzzle',
    });
    expect(href).toBe(`/practice/position-memory/${ID}`);
    expect(href).not.toContain('/practice/puzzle/');
  });
});
