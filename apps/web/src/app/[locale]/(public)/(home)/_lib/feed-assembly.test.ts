import { describe, expect, it } from 'vitest';

import type { FeedRow } from './queries';
import { assembleFeedItems, splitFeedPage } from './queries';

const at = (iso: string) => new Date(iso);

const row = (overrides: Partial<FeedRow> & Pick<FeedRow, 'entityType' | 'entityId'>): FeedRow => ({
  id: `feed-${overrides.entityId}`,
  actorId: 'actor-1',
  createdAt: at('2026-05-18T10:00:00.000Z'),
  metadata: null,
  ...overrides,
});

/** Only the map lookups matter here; payload contents are opaque to the join. */
const maps = (overrides: Partial<Record<keyof ReturnType<typeof emptyMaps>, unknown>> = {}) =>
  ({ ...emptyMaps(), ...overrides }) as never;

const emptyMaps = () => ({
  topicPostMap: new Map(),
  positionMap: new Map(),
  chunkMap: new Map(),
  gameMap: new Map(),
  rankUpdateActorMap: new Map(),
});

describe('splitFeedPage', () => {
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      createdAt: at(`2026-05-18T10:0${i}:00.000Z`),
    }));

  it('returns every row and no cursor when the page is not full', () => {
    const { rows: page, nextCursor } = splitFeedPage(rows(3), 5);
    expect(page).toHaveLength(3);
    expect(nextCursor).toBeNull();
  });

  it('returns no cursor when the row count exactly equals the limit', () => {
    // The has-more probe is the (limit + 1)-th row; without it there is no
    // next page, even though the page came back full.
    const { rows: page, nextCursor } = splitFeedPage(rows(5), 5);
    expect(page).toHaveLength(5);
    expect(nextCursor).toBeNull();
  });

  it('drops the probe row and cursors on the last returned row', () => {
    const { rows: page, nextCursor } = splitFeedPage(rows(6), 5);
    expect(page).toHaveLength(5);
    expect(nextCursor).toBe('2026-05-18T10:04:00.000Z');
  });

  it('does not alias the input array', () => {
    const input = rows(3);
    const { rows: page } = splitFeedPage(input, 5);
    page.pop();
    expect(input).toHaveLength(3);
  });
});

describe('assembleFeedItems', () => {
  it('joins each entity type to its payload', () => {
    const items = assembleFeedItems(
      [
        row({ entityType: 'topic_post', entityId: 'tp1' }),
        row({ entityType: 'position', entityId: 'ps1' }),
        row({ entityType: 'game', entityId: 'g1' }),
      ],
      maps({
        topicPostMap: new Map([['tp1', { body: 'post' }]]),
        positionMap: new Map([['ps1', { title: 'position' }]]),
        gameMap: new Map([['g1', { title: 'game' }]]),
      })
    );
    expect(items.map((i) => i.entityType)).toEqual(['topic_post', 'position', 'game']);
    expect(items[0]).toMatchObject({
      id: 'feed-tp1',
      entityId: 'tp1',
      actorId: 'actor-1',
      createdAt: '2026-05-18T10:00:00.000Z',
    });
  });

  it('drops a row whose entity no longer exists', () => {
    // The entity can be deleted between the feed-item write and this read.
    const items = assembleFeedItems([row({ entityType: 'position', entityId: 'gone' })], maps());
    expect(items).toEqual([]);
  });

  it('ignores an unknown entity type instead of emitting a shapeless item', () => {
    const items = assembleFeedItems(
      [row({ entityType: 'sometime_future', entityId: 'x' })],
      maps()
    );
    expect(items).toEqual([]);
  });

  it('coerces chunk metadata to created unless it says published', () => {
    const chunkMap = new Map([['ch1', { title: 'chunk' }]]);
    const assemble = (metadata: unknown) =>
      assembleFeedItems(
        [row({ entityType: 'chunk', entityId: 'ch1', metadata })],
        maps({ chunkMap })
      );

    expect(assemble({ kind: 'published' })[0].data).toMatchObject({ kind: 'published' });
    expect(assemble({ kind: 'created' })[0].data).toMatchObject({ kind: 'created' });
    expect(assemble({ kind: 'nonsense' })[0].data).toMatchObject({ kind: 'created' });
    expect(assemble(null)[0].data).toMatchObject({ kind: 'created' });
  });

  it('keeps a rank-update row whose actor resolves, and unpacks its metadata', () => {
    const items = assembleFeedItems(
      [
        row({
          entityType: 'challenge_rank_update',
          entityId: 'r1',
          metadata: {
            menuType: 'coordinate_quiz',
            leaderboardKey: 'white',
            score: 42,
            incorrectAnswers: 1,
            timeTaken: 30,
            rank: 3,
            isNewEntry: true,
          },
        }),
      ],
      maps({ rankUpdateActorMap: new Map([['actor-1', { username: 'alice' }]]) })
    );
    expect(items[0].data).toMatchObject({ menuType: 'coordinate_quiz', rank: 3, isNewEntry: true });
  });

  it('drops a rank-update row whose actor is gone', () => {
    const items = assembleFeedItems(
      [row({ entityType: 'challenge_rank_update', entityId: 'r1', metadata: {} })],
      maps()
    );
    expect(items).toEqual([]);
  });

  it('preserves row order across mixed entity types', () => {
    const items = assembleFeedItems(
      [
        row({ entityType: 'game', entityId: 'g1' }),
        row({ entityType: 'position', entityId: 'ps1' }),
        row({ entityType: 'game', entityId: 'g2' }),
      ],
      maps({
        gameMap: new Map([
          ['g1', { title: 'a' }],
          ['g2', { title: 'b' }],
        ]),
        positionMap: new Map([['ps1', { title: 'p' }]]),
      })
    );
    expect(items.map((i) => i.entityId)).toEqual(['g1', 'ps1', 'g2']);
  });
});
