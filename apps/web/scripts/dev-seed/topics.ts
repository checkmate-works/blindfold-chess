import { and, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { chessOpenings, feedItems, topicPosts } from '../../src/lib/db/schema';

type SeedThread = {
  topicType: 'square' | 'opening';
  /** A square name, or an opening's `chess_openings.slug`. */
  topicKey: string;
  content: string;
  /** Replies under the root post, oldest first. */
  replies: string[];
};

/**
 * Twelve discussion threads across the squares and openings boards.
 *
 * Twelve because `/topics` server-renders `INITIAL_FEED_SIZE = 10` items and
 * the native ad card is spliced in after the sixth (`NATIVE_AD_AFTER_INDEX`,
 * clamped to the last entry on a shorter page). A feed of two or three
 * renders the ad at the bottom, which is the one position it never occupies
 * in production — so a thin seed makes the placement look right while testing
 * the wrong thing.
 *
 * The board splits roughly two to one in favour of squares because the square
 * threads are the ones that need no other seed to exist: a square is derived
 * from the board, whereas an opening is a `chess_openings` row that only
 * `pnpm db:seed` puts there.
 */
const SEED_THREADS: SeedThread[] = [
  {
    topicType: 'square',
    topicKey: 'e4',
    content:
      'Blindfold, e4 is the square I lose track of first once the centre opens. Anyone found a landmark that survives a few exchanges?',
    replies: [
      'I anchor it off d4 rather than off the file — two squares that move together are easier to hold than one that moves alone.',
      'Counting the diagonal from a8 works for me, but only while the long diagonal is unobstructed.',
    ],
  },
  {
    topicType: 'square',
    topicKey: 'd4',
    content:
      'Does anyone else picture d4 and e4 as one block rather than two squares? It halves what I have to keep in memory but I lose the ability to talk about either one alone.',
    replies: ['Same, and it breaks the moment one of them is occupied and the other is not.'],
  },
  {
    topicType: 'square',
    topicKey: 'f7',
    content:
      'f7 is the first square a beginner learns to fear and the last one I remember to check blindfold. Which is backwards.',
    replies: [],
  },
  {
    topicType: 'square',
    topicKey: 'h1',
    content:
      'Corner squares should be the easy ones — they have the fewest neighbours — and yet h1 is where I second-guess the colour every time.',
    replies: ['h1 is light. I remember it through the rook, not the coordinate.'],
  },
  {
    topicType: 'square',
    topicKey: 'c5',
    content:
      'Whenever I play the black side of a Sicilian blindfold, c5 stays vivid and c6 goes missing. Adjacent squares, completely different recall.',
    replies: [],
  },
  {
    topicType: 'square',
    topicKey: 'e5',
    content:
      'Mirror squares (e4/e5, d4/d5) are the ones I swap under time pressure. Is there a naming trick that keeps them apart?',
    replies: [
      'I say the rank out loud before the file. Reversing the order was enough to stop the swap for me.',
    ],
  },
  {
    topicType: 'square',
    topicKey: 'g1',
    content:
      'After castling short the king sits on g1 and I still catch myself looking for it on e1 three moves later.',
    replies: [],
  },
  {
    topicType: 'square',
    topicKey: 'a8',
    content:
      'The long diagonal is the one line I can hold end to end blindfold. a8 and h1 feel like the same object seen from two sides.',
    replies: [],
  },
  {
    topicType: 'opening',
    topicKey: 'ruy-lopez',
    content:
      'The Ruy is the opening that taught me to track a piece across the whole board — the bishop goes b5, a4, b3 and it is still the same piece doing the same job.',
    replies: [
      'That retreat sequence is exactly what makes it hard blindfold: three squares, one intention.',
      'Playing it without sight made me realise I had memorised the move order and not the plan.',
    ],
  },
  {
    topicType: 'opening',
    topicKey: 'italian-game',
    content:
      'The Italian is the friendliest opening to play blindfold — both bishops land where you expect and nothing retreats for ten moves.',
    replies: [],
  },
  {
    topicType: 'opening',
    topicKey: 'scotch-game',
    content:
      'The early central exchange in the Scotch clears the board faster than anything else I play, which makes it a good place to practice holding a position with fewer landmarks.',
    replies: [],
  },
  {
    topicType: 'opening',
    topicKey: 'kings-gambit',
    content:
      "The King's Gambit blindfold is mostly an exercise in remembering that f4 is gone and f2 is open. Everything else follows from those two facts.",
    replies: ['And that the king has no shelter on the side you would normally castle to.'],
  },
];

/** Every string this seed owns, so a re-run can find its own rows and no others. */
const SEED_CONTENTS = SEED_THREADS.flatMap((thread) => [thread.content, ...thread.replies]);

export type SeededThread = {
  topicType: string;
  topicKey: string;
  replyCount: number;
};

/**
 * Replace this seed's topic threads for `authorIds`, newest first.
 *
 * Scoped by author *and* by exact content, the way `reseedPuzzles` scopes by
 * title: a re-run must not touch a thread someone wrote by hand while signed
 * in as a seed user. Replies come back through the root's `ON DELETE CASCADE`,
 * so only the roots need finding — they are matched anyway, since a reply
 * string is as much this seed's property as a root one.
 *
 * `feed_items.entity_id` has no FK (the table is polymorphic), so its rows are
 * deleted explicitly and first, exactly as the puzzle seed has to.
 *
 * Opening threads are dropped when their slug is not in `chess_openings` —
 * that table is master data from `pnpm db:seed`, and a post keyed to a
 * nonexistent opening is a thread with no page to open. The square threads
 * never need that check, which is why most of the seed is squares.
 */
export async function reseedTopics(
  db: PostgresJsDatabase,
  authorIds: string[]
): Promise<{ threads: SeededThread[]; skippedOpenings: string[] }> {
  if (authorIds.length === 0) return { threads: [], skippedOpenings: [] };

  const stale = await db
    .select({ id: topicPosts.id })
    .from(topicPosts)
    .where(and(inArray(topicPosts.userId, authorIds), inArray(topicPosts.content, SEED_CONTENTS)));

  if (stale.length > 0) {
    const staleIds = stale.map((row) => row.id);
    await db.delete(feedItems).where(inArray(feedItems.entityId, staleIds));
    await db.delete(topicPosts).where(inArray(topicPosts.id, staleIds));
  }

  const openingSlugs = new Set(
    (await db.select({ slug: chessOpenings.slug }).from(chessOpenings)).map((row) => row.slug)
  );
  const wanted = (thread: SeedThread) =>
    thread.topicType !== 'opening' || openingSlugs.has(thread.topicKey);
  const threads = SEED_THREADS.filter(wanted);
  const skippedOpenings = SEED_THREADS.filter((t) => !wanted(t)).map((t) => t.topicKey);

  const seeded: SeededThread[] = [];

  // Walk backwards in time from now, a few minutes apart, so the feed has a
  // stable order and a usable cursor rather than a dozen rows sharing one
  // timestamp. The array reads newest-first, which is the order `/topics`
  // renders.
  const now = Date.now();
  const STEP_MS = 7 * 60 * 1000;

  for (const [index, thread] of threads.entries()) {
    const userId = authorIds[index % authorIds.length];
    const createdAt = new Date(now - index * STEP_MS);

    const [root] = await db
      .insert(topicPosts)
      .values({
        userId,
        topicType: thread.topicType,
        topicKey: thread.topicKey,
        content: thread.content,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: topicPosts.id });

    // Only top-level square/opening posts emit a feed item — a reply never
    // does (`createReply` inserts none), which is what keeps the timeline a
    // list of threads rather than of messages.
    await db.insert(feedItems).values({
      entityType: 'topic_post',
      entityId: root.id,
      actorId: userId,
      metadata: { topicType: thread.topicType, topicKey: thread.topicKey },
      createdAt,
    });

    for (const [replyIndex, content] of thread.replies.entries()) {
      // Later than the root and earlier than the next thread, so a thread
      // reads in order and no reply predates what it answers.
      const repliedAt = new Date(createdAt.getTime() + (replyIndex + 1) * 60 * 1000);
      await db.insert(topicPosts).values({
        // Not the root's author: a thread answering itself exercises none of
        // the notification or blocked-author paths the feed reads through.
        userId: authorIds[(index + replyIndex + 1) % authorIds.length],
        topicType: thread.topicType,
        topicKey: thread.topicKey,
        parentId: root.id,
        rootPostId: root.id,
        content,
        createdAt: repliedAt,
        updatedAt: repliedAt,
      });
    }

    seeded.push({
      topicType: thread.topicType,
      topicKey: thread.topicKey,
      replyCount: thread.replies.length,
    });
  }

  return { threads: seeded, skippedOpenings };
}
