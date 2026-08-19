import type { PositionType } from './types';

/**
 * The position types that have their own pages: everything `positions.type`
 * can hold except `'sequence'`, which is stored but has no detail route.
 *
 * Six modules declared their own `'memory' | 'puzzle'` union — under three
 * different names — and each carried its own copy of the per-kind routing and
 * i18n constants below. Deriving the union from `PositionType` means adding a
 * fourth position type forces a decision here rather than silently leaving six
 * unions describing a set that no longer matches the column.
 */
export type PositionKind = Exclude<PositionType, 'sequence'>;

export type PositionKindConfig = {
  /** URL segment under `/practice`. */
  slug: 'position-memory' | 'puzzle';
  /** `next-intl` namespace holding this kind's `list.*` / `edit.*` messages. */
  namespace: string;
  /** The `topic_posts.topic_type` this kind's comment threads are stored under. */
  topicType: 'position_memory' | 'position_puzzle';
};

export const POSITION_KIND_CONFIG: Record<PositionKind, PositionKindConfig> = {
  memory: {
    slug: 'position-memory',
    namespace: 'practice.positionMemory',
    topicType: 'position_memory',
  },
  puzzle: { slug: 'puzzle', namespace: 'practice.puzzle', topicType: 'position_puzzle' },
};

const POSITION_KINDS = Object.keys(POSITION_KIND_CONFIG) as readonly PositionKind[];

/** Narrow an untyped `positions.type` value to a kind that has pages. */
export function isPositionKind(value: string): value is PositionKind {
  return (POSITION_KINDS as readonly string[]).includes(value);
}

/**
 * The kind whose comment threads live under `topicType`, or `null` for a
 * topic type that is not a position (`square`, `opening`, `chunk`, ...).
 */
export function getPositionKindForTopicType(topicType: string): PositionKind | null {
  return POSITION_KINDS.find((kind) => POSITION_KIND_CONFIG[kind].topicType === topicType) ?? null;
}

/** The kind's list page, e.g. `/practice/puzzle`. */
export function getPositionListPath(kind: PositionKind): string {
  return `/practice/${POSITION_KIND_CONFIG[kind].slug}`;
}

/**
 * The kind's detail page. Non-null by construction, unlike
 * {@link getPositionDetailPath}, which also has to answer for `'sequence'`.
 */
export function getPositionKindDetailPath(kind: PositionKind, id: string): string {
  return `${getPositionListPath(kind)}/${id}`;
}

/**
 * A single post inside a position's inline comment tree. Positions have no
 * per-post detail page: the detail page renders the whole tree, where every
 * node carries `id="post-{id}"`, so a deep link is the detail path plus that
 * anchor. Three surfaces — notifications, benefit sources, coin history —
 * each spelled the two `/practice/...#post-...` paths out by hand.
 */
export function getPositionPostAnchorPath(
  kind: PositionKind,
  positionId: string,
  postId: string
): string {
  return `${getPositionKindDetailPath(kind, positionId)}#post-${postId}`;
}
