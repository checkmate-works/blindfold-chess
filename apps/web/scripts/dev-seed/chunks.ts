import { inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { buildChunkCreateValues } from '../../src/lib/chunks/mutation-helpers';
import type { ChunkFeedbackTopic, ChunkStatus } from '../../src/lib/chunks/validation';
import { validateChunkMutationData } from '../../src/lib/chunks/validation';
import { chunkFeedbackTopics, chunks, feedItems } from '../../src/lib/db/schema';

type SeedChunk = {
  slug: string;
  title: string;
  description: string;
  /** A pattern, not a legal position — chunks legitimately omit kings. */
  representativeFen: string;
  status: ChunkStatus;
  /** Draft-only: which fields the author is asking for suggestions on. */
  feedbackTopics?: ChunkFeedbackTopic[];
};

/**
 * Nine piece-coordination patterns, six published and three still in draft.
 *
 * Both states are needed to look at the catalog at all: `/chunks` has All /
 * Drafts / Published filter chips, and a seed of one state leaves two of the
 * three tabs empty. The drafts carry `feedbackTopics`, which is what puts the
 * "asking about the title" chips on their cards — the one piece of the list
 * card that no published chunk ever renders.
 *
 * Nine, so the page (20 per page, `DEFAULT_PAGE_SIZE`) holds them all in one
 * window with two native ad slots on it, and the Published tab alone still
 * has more entries than the ad interval.
 *
 * The FENs are patterns rather than legal positions — most have no kings.
 * That is the point of a chunk and is why `validateChunkMutationData` checks
 * FEN *structure* rather than legality; seeding a legal position for each one
 * would quietly stop exercising that distinction.
 */
const SEED_CHUNKS: SeedChunk[] = [
  {
    slug: 'kingside-fianchetto',
    title: 'Kingside fianchetto',
    description:
      'Bishop on g2 behind the f2-g3-h2 pawn wall, aiming down the long diagonal. The shape recurs in the King’s Indian, the Catalan and half the English, so it is worth holding as one object rather than four pieces.',
    representativeFen: '8/8/8/8/8/6P1/5PBP/8 w - - 0 1',
    status: 'published',
  },
  {
    slug: 'rook-battery-on-an-open-file',
    title: 'Rook battery on an open file',
    description:
      'Two rooks stacked on the same file, the front one free to enter. Blindfold, the pair is easier to track than either rook alone: they move as a unit until the file resolves.',
    representativeFen: '8/8/8/8/8/8/3R4/3R4 w - - 0 1',
    status: 'published',
  },
  {
    slug: 'bishop-pair-on-adjacent-diagonals',
    title: 'Bishop pair on adjacent diagonals',
    description:
      'Bishops on c4 and d3 covering the two diagonals into the kingside. The pattern is the reason an attack lands three moves later, and it is the one to recognise before the attack exists.',
    representativeFen: '8/8/8/8/2B5/3B4/8/8 w - - 0 1',
    status: 'published',
  },
  {
    slug: 'knight-outpost-on-the-sixth',
    title: 'Knight outpost on the sixth',
    description:
      'A knight on d6 supported by a pawn on e5, with no pawn left to challenge it. Hard to dislodge and harder to remember you left it there — blindfold, outposts are the pieces that go missing.',
    representativeFen: '8/8/3N4/4P3/8/8/8/8 w - - 0 1',
    status: 'published',
  },
  {
    slug: 'back-rank-escape-square',
    title: 'Back-rank escape square',
    description:
      'The h-pawn pushed one square, opening the flight the back rank otherwise lacks. One pawn move, and a whole family of mates stops working.',
    representativeFen: '6k1/5pp1/7p/8/8/8/8/8 b - - 0 1',
    status: 'published',
  },
  {
    slug: 'isolated-queens-pawn',
    title: 'Isolated queen’s pawn',
    description:
      'A pawn on d4 with no neighbours on the c- and e-files. The square in front of it is the square both sides are actually playing for, which makes the pawn easier to hold in memory than its own file.',
    representativeFen: '8/8/8/8/3P4/8/8/8 w - - 0 1',
    status: 'published',
  },
  {
    slug: 'queenside-pawn-majority',
    title: 'Queenside pawn majority',
    description:
      'Three pawns against two on the a-, b- and c-files. Is "majority" the right word here, or is what matters that it is a *passed pawn in waiting*? Suggestions welcome on the title.',
    representativeFen: '8/8/8/8/8/8/PPP5/8 w - - 0 1',
    status: 'draft',
    feedbackTopics: ['title'],
  },
  {
    slug: 'rook-and-pawn-on-the-seventh',
    title: 'Rook and pawn on the seventh',
    description:
      'Rook on b7 with its own pawn on a7. I am fairly sure the description undersells why this is one chunk and not two pieces — would appreciate a sharper wording.',
    representativeFen: '8/PR6/8/8/8/8/8/8 w - - 0 1',
    status: 'draft',
    feedbackTopics: ['description'],
  },
  {
    slug: 'doubled-pawns-as-a-shield',
    title: 'Doubled pawns as a shield',
    description:
      'Pawns on f2 and f3 after a capture, covering e4 and g4 between them. Usually filed under weaknesses; the coordination is the part worth memorising, and I am not sure either the name or the wording says that.',
    representativeFen: '8/8/8/8/8/5P2/5P2/8 w - - 0 1',
    status: 'draft',
    feedbackTopics: ['title', 'description'],
  },
];

const SEED_SLUGS = SEED_CHUNKS.map((chunk) => chunk.slug);

export type SeededChunk = { slug: string; status: ChunkStatus };

/**
 * Replace this seed's chunks for `authorIds`.
 *
 * Scoped by slug, which is `chunks.slug`'s own unique key, so a re-run finds
 * exactly its own rows and leaves a chunk written by hand alone. The author
 * is not part of the scope the way it is for topic threads: the slug is
 * unique across the table, so a hand-written chunk that took one of these
 * names would collide on insert whoever owns it — deleting by slug is the
 * only way a re-run can succeed at all.
 *
 * `feed_items.entity_id` has no FK (the table is polymorphic), so those rows
 * are deleted explicitly and first; `chunk_feedback_topics` cascades off
 * `chunks.id` and does not need to be.
 *
 * Every row goes through `validateChunkMutationData` and
 * `buildChunkCreateValues` rather than being written straight to the columns,
 * so a seed chunk is exactly what the create action would have written — a
 * malformed FEN here fails the seed instead of producing a catalog row the
 * app would never have accepted.
 */
export async function reseedChunks(
  db: PostgresJsDatabase,
  authorIds: string[]
): Promise<SeededChunk[]> {
  if (authorIds.length === 0) return [];

  const stale = await db
    .select({ id: chunks.id })
    .from(chunks)
    .where(inArray(chunks.slug, SEED_SLUGS));

  if (stale.length > 0) {
    const staleIds = stale.map((row) => row.id);
    await db.delete(feedItems).where(inArray(feedItems.entityId, staleIds));
    await db.delete(chunks).where(inArray(chunks.id, staleIds));
  }

  const seeded: SeededChunk[] = [];

  // Spaced backwards from now so the catalog's `created_at DESC` order is
  // stable rather than a nine-way tie.
  const now = Date.now();
  const STEP_MS = 11 * 60 * 1000;

  for (const [index, chunk] of SEED_CHUNKS.entries()) {
    const userId = authorIds[index % authorIds.length];
    const createdAt = new Date(now - index * STEP_MS);

    const data = {
      representativeFen: chunk.representativeFen,
      title: chunk.title,
      slug: chunk.slug,
      description: chunk.description,
      userId,
      status: chunk.status,
    };
    const error = validateChunkMutationData(data);
    if (error) {
      throw new Error(`dev-seed: chunk "${chunk.slug}" is invalid (${error})`);
    }

    const [inserted] = await db
      .insert(chunks)
      .values({
        ...buildChunkCreateValues(data),
        createdAt,
        updatedAt: createdAt,
        // Set only on the published path, the way `publishChunkEntry` writes
        // it: the catalog can sort by "recently published" and a draft has
        // nothing to put there.
        publishedAt: chunk.status === 'published' ? createdAt : null,
      })
      .returning({ id: chunks.id });

    if (chunk.feedbackTopics && chunk.feedbackTopics.length > 0) {
      await db
        .insert(chunkFeedbackTopics)
        .values(chunk.feedbackTopics.map((topic) => ({ chunkId: inserted.id, topic })));
    }

    await db.insert(feedItems).values({
      entityType: 'chunk',
      entityId: inserted.id,
      actorId: userId,
      // `created` for a draft, `published` for one that arrives published —
      // the two kinds the create action emits.
      metadata: { kind: chunk.status === 'published' ? 'published' : 'created', slug: chunk.slug },
      createdAt,
    });

    seeded.push({ slug: chunk.slug, status: chunk.status });
  }

  return seeded;
}
