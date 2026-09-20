/**
 * Single source of truth for self-served ad slots and their creative kinds.
 *
 * Every ad slot (placement) accepts exactly one creative `kind`. The DB
 * (`ad_creatives`) cannot express that constraint — `slot` and `kind` are
 * just varchars — so writes validate against this registry, and readers
 * narrow a row by the kind its slot binds. Adding a new placement or format
 * starts here: add the slot (and, for a new format, the `kind`), then give
 * the format its columns and CHECK (`@/lib/db/schema/notifications`), its
 * branch in the admin validator, and a renderer.
 *
 * There are three kinds, because there are three card shapes to blend into.
 * `native_card` is a row in a list — a feed item, a post, a glossary term.
 * `native_tile` is a cell in the `/practice` grid, where the neighbours are
 * module tiles with an emoji, a title and an example band and a row-shaped
 * card would be the only thing on the page that is not a tile.
 * `native_thumb` is a cell in the puzzle result screen's "next puzzles"
 * grid: a square board thumbnail with a one-line title under it and nothing
 * else. It is the card minus the author row and minus the description,
 * because the tiles beside it have neither and a creative that carried them
 * would be the one cell in the row that is taller than its neighbours.
 *
 * A fourth kind is the answer whenever a new surface's cards are a fourth
 * shape. It extends `ad_creatives_chk_kind` and
 * `ad_creatives_chk_fields_for_kind` (adding columns only if its shape needs
 * a field no other kind has — `native_thumb` needed none), a branch in the
 * admin's field validator, a renderer, and an authoring form. The
 * validator's switch is exhaustive over `AdKind`, so the compiler names that
 * one for you; the admin pages pick their form from the slot's kind at
 * runtime and will not.
 *
 * Mirrors the "one registry, everything derives from it" pattern used by
 * `PRACTICE_MODULE_REGISTRY`.
 */

export const AD_KINDS = ['native_card', 'native_tile', 'native_thumb'] as const;
export type AdKind = (typeof AD_KINDS)[number];

export function isAdKind(value: string): value is AdKind {
  return (AD_KINDS as readonly string[]).includes(value);
}

/**
 * A place one of a slot's creatives actually renders, written so an admin can
 * go and look at it.
 *
 * It lives beside the slot rather than in the slot's prose because
 * `/admin/ads` is where someone stands when they need it — about to activate
 * a creative, with no way to tell from a key like
 * `topic-catalog-native-ad` which of the two catalogs it means, or whether
 * `feed-native-ad` reaches `/topics` as well as the home page. The prose
 * below each slot constant explains *why* the pool is split the way it is;
 * this is the part that has to be clickable.
 *
 * It is the one thing in this registry that code does not enforce: a page
 * that starts reading a slot does not have to declare itself here, so a
 * missing entry is possible in a way a missing `kind` is not. Adding the
 * render site to the slot's entry is part of wiring up a surface — the two
 * edits sit one scroll apart for that reason.
 */
type AdSurface = {
  /** The route under `/[locale]`, spelled as the app tree spells it. */
  route: string;
  /**
   * A path that opens the route, when some value of every dynamic segment is
   * guaranteed to resolve. Omitted otherwise — an opening's slug is seeded
   * content an admin can delete, so a link to one would rot, and a rotted
   * link is worse than a route the reader navigates to themselves.
   */
  href?: string;
};

type AdSlotConfig = { kind: AdKind; surfaces: readonly AdSurface[] };

/**
 * Slot → config binding, keyed by physical placement. Each slot needs a
 * code-level renderer, so the set is fixed. The admin index (`/admin/ads`)
 * iterates this object, so a new entry here appears there with no admin
 * change.
 *
 * A slot keys a creative pool, not a surface. Two surfaces may name the same
 * slot when they want the same pool: the home feed and `/topics` both read
 * `feed-native-ad`, because `/topics` is the home timeline machinery
 * (`getFeedData` + `FeedClient`) scoped to topic entities, so a card written
 * for one reads correctly in the other. A surface that wants its own pool —
 * or two independently-filled placements — adds a slot rather than a
 * "sub-slot" extension of this registry. Splitting a shared pool that way is
 * a content decision as much as a wiring one: creatives are authored per slot
 * key, so the new slot renders nothing until someone writes one for it.
 *
 * Every slot here is in-content, and that is deliberate. This registry used
 * to also carry fixed banner placements — a `banner` kind rendered into
 * reserved rectangles above and below page content — and they were removed
 * rather than left unused. A banner is the opposite of a native ad: it
 * announces itself as an ad block in a shape belonging to no surface, which
 * is precisely what a native ad is defined by not doing. The affiliate
 * networks do supply ready-made banner creatives, and this site uses none of
 * them; a creative here is a card written for the surface it lands in. So a
 * new placement is a new in-content surface, and the answer to "where do we
 * put a banner?" is that there is nowhere for one to go.
 */
export const AD_SLOTS = {
  'feed-native-ad': {
    kind: 'native_card',
    surfaces: [
      { route: '/', href: '/' },
      { route: '/topics', href: '/topics' },
    ],
  },
  'topic-catalog-native-ad': {
    kind: 'native_card',
    surfaces: [
      { route: '/topics/squares', href: '/topics/squares' },
      { route: '/topics/openings', href: '/topics/openings' },
    ],
  },
  'topic-detail-native-ad': {
    kind: 'native_card',
    surfaces: [
      // Squares are derived from the board, so e4 is always there; an
      // opening's slug is seeded content and is not.
      { route: '/topics/squares/[square]', href: '/topics/squares/e4' },
      { route: '/topics/openings/[slug]' },
    ],
  },
  'chunk-list-native-ad': {
    kind: 'native_card',
    surfaces: [{ route: '/chunks', href: '/chunks' }],
  },
  'glossary-term-list-native-ad': {
    kind: 'native_card',
    surfaces: [
      // Both segments come from fixed lists (A-Z, and the five category
      // keys), and both pages are prerendered with `dynamicParams = false`.
      { route: '/glossary/letter/[letter]', href: '/glossary/letter/a' },
      { route: '/glossary/category/[category]', href: '/glossary/category/notation' },
    ],
  },
  'puzzle-result-native-ad': {
    kind: 'native_thumb',
    // The result screen exists per puzzle, and every puzzle id resolves for
    // as long as that puzzle does — which is not a guarantee this registry
    // can make, so the route is shown without a link.
    surfaces: [{ route: '/practice/puzzle/[id]/result' }],
  },
  'puzzle-detail-native-ad': {
    kind: 'native_thumb',
    surfaces: [{ route: '/practice/puzzle/[id]' }],
  },
  'position-memory-result-native-ad': {
    kind: 'native_thumb',
    surfaces: [{ route: '/practice/position-memory/[id]/result' }],
  },
  'position-memory-detail-native-ad': {
    kind: 'native_thumb',
    surfaces: [{ route: '/practice/position-memory/[id]' }],
  },
  'practice-result-native-ad': {
    kind: 'native_tile',
    // One entry for a slot that renders on every practice module's result
    // screen. The route is listed once with a representative module, because
    // the placement is the shared `PracticeComplete` layout rather than any
    // one module's page.
    surfaces: [{ route: '/practice/<module>/result', href: '/practice/square-colors/result' }],
  },
  'practice-grid-native-ad': {
    kind: 'native_tile',
    surfaces: [{ route: '/practice', href: '/practice' }],
  },
  'puzzle-list-native-ad': {
    kind: 'native_card',
    surfaces: [{ route: '/practice/puzzle', href: '/practice/puzzle' }],
  },
  'position-memory-list-native-ad': {
    kind: 'native_card',
    surfaces: [{ route: '/practice/position-memory', href: '/practice/position-memory' }],
  },
} as const satisfies Record<string, AdSlotConfig>;

export type AdSlot = keyof typeof AD_SLOTS;

export const AD_SLOT_VALUES = Object.keys(AD_SLOTS) as AdSlot[];

export function isAdSlot(value: string): value is AdSlot {
  return Object.prototype.hasOwnProperty.call(AD_SLOTS, value);
}

export function kindForSlot(slot: AdSlot): AdKind {
  return AD_SLOTS[slot].kind;
}

/** Where the slot's creatives render. See {@link AdSurface}. */
export function surfacesForSlot(slot: AdSlot): readonly AdSurface[] {
  return AD_SLOTS[slot].surfaces;
}

export type { AdSurface };

/** The pool the home feed and `/topics` both draw their native card from. */
export const FEED_NATIVE_AD_SLOT = 'feed-native-ad' satisfies AdSlot;

/**
 * The pool the two topic catalogs — `/topics/squares` and `/topics/openings`
 * — draw their native card from. Separate from `feed-native-ad` on purpose:
 * attribution is per creative (see `withCreativeSubId`), so two surfaces that
 * share a pool are indistinguishable in the network's own report, and a
 * catalog reader browsing one square or opening at a time is a different
 * reader from the one scrolling the timeline.
 */
export const TOPIC_CATALOG_NATIVE_AD_SLOT = 'topic-catalog-native-ad' satisfies AdSlot;

/**
 * The pool the two topic discussion threads — an opening's page and a
 * square's — draw their native card from. Split from the catalogs' pool
 * because the reader is at a different point: the catalog reader is still
 * choosing what to read, while this one has already picked a subject and is
 * reading other people's posts about it, which is the moment a creative
 * written to be read rather than clicked past has to earn.
 */
export const TOPIC_DETAIL_NATIVE_AD_SLOT = 'topic-detail-native-ad' satisfies AdSlot;

/**
 * The pool the chunk catalog (`/chunks`) draws its native card from.
 *
 * Its own pool rather than the feed's, even though `/topics` already shows
 * chunk entities through `feed-native-ad`. Those are chunk *events* passing
 * through a timeline — someone published one — and the reader is scrolling.
 * Here the same chunks are the subject: a catalog of piece-coordination
 * patterns, browsed by someone deciding what to memorise next, twenty to a
 * page. A creative written for one reader is not the creative for the other,
 * and sharing a pool would make the two indistinguishable in the network's
 * report as well (see `withCreativeSubId`).
 *
 * The chunk *detail* page has no slot yet. It is a pattern plus its
 * discussion thread, which is the shape `topic-detail-native-ad` already
 * serves for openings and squares; whether it joins that pool or takes its
 * own is the same content decision as every other split here, and nothing
 * needs it answered until a creative is written for it.
 */
export const CHUNK_LIST_NATIVE_AD_SLOT = 'chunk-list-native-ad' satisfies AdSlot;

/**
 * The pool the glossary term lists — a letter's page and a category's —
 * draw their native card from.
 *
 * This is the first static surface to carry an ad, and it reaches the pool
 * differently from every other one. `resolveNativeAds` needs the viewer, and
 * reading the viewer means `cookies()`, which would turn 30-odd prerendered
 * pages dynamic. The term lists call `getNativeAdCreatives` instead — the
 * viewer-independent, tag-invalidated read — and leave the entitlement to the
 * `bfc_ads_hidden` cookie and the CSS rule that hides `.ad-slot-wrapper`,
 * which is the layer that exists for exactly this case.
 */
export const GLOSSARY_TERM_LIST_NATIVE_AD_SLOT = 'glossary-term-list-native-ad' satisfies AdSlot;

/**
 * The pool the puzzle result screen's "next puzzles" grid draws its native
 * thumb from — the one slot bound to `native_thumb`, because it is the one
 * surface whose cards are a board thumbnail and a single line of text.
 *
 * The grid is four cells wide and stays four cells wide: the ad takes the
 * first one and the fourth puzzle drops off, rather than the section growing
 * a fifth cell that would sit alone on a second row at both breakpoints. A
 * reader who sees no ads gets four puzzles.
 *
 * Leading the grid rather than trailing it is the same rule every vertical
 * list follows (see `AD_INTERVAL` in `@/lib/ads/placement`), and it matters
 * more here than anywhere: this section sits above the result screen's action
 * buttons, so a trailing cell is the thing a solver scrolls past on their way
 * to Try Again.
 */
export const PUZZLE_RESULT_NATIVE_AD_SLOT = 'puzzle-result-native-ad' satisfies AdSlot;

/**
 * The pool a puzzle's own page draws its native thumb from, in the "other
 * puzzles" grid above the comments.
 *
 * Split from the result screen's pool even though the two grids are the same
 * component and the same shape, because the reader is at opposite ends of the
 * same task: here they are about to solve and are reading the position, there
 * they have just finished one. It is the split between
 * `topic-catalog-native-ad` and `topic-detail-native-ad` again — and, as
 * there, attribution is per creative (`withCreativeSubId`), so two surfaces
 * sharing a pool are one line in the network's report and cannot be told
 * apart afterwards.
 *
 * The section carries a different heading for the same reason it carries a
 * different pool: "Next puzzles" is what you offer someone who has finished,
 * and this reader has not started.
 */
export const PUZZLE_DETAIL_NATIVE_AD_SLOT = 'puzzle-detail-native-ad' satisfies AdSlot;

/**
 * The pools the position-memory catalog's two grids draw their native thumb
 * from: the result screen after a run, and a position's own page above the
 * comments.
 *
 * Four thumb pools now exist — these two and the puzzle pair — and they are
 * four because the reader is somewhere different at each. Two axes, both
 * real. Across catalogs: a puzzle asks for the best move, a memory position
 * asks you to rebuild the board, and someone who has chosen one of those has
 * told you something about what they are here for. Within a catalog: before
 * versus after, which is the same split `topic-catalog-native-ad` and
 * `topic-detail-native-ad` make.
 *
 * The cost of the split is four pools to write for instead of one, and that
 * cost is the point: a creative here is a card written for the surface it
 * lands in, and attribution is per creative (`withCreativeSubId`), so pools
 * that share would be one line in the network's report with no way to tell
 * afterwards which surface earned it. Slots that turn out not to deserve
 * their own copy can be pointed at the same creative text; slots that were
 * never separated cannot be separated after the fact without losing the
 * history.
 */
export const POSITION_MEMORY_RESULT_NATIVE_AD_SLOT =
  'position-memory-result-native-ad' satisfies AdSlot;

/** See {@link POSITION_MEMORY_RESULT_NATIVE_AD_SLOT}. */
export const POSITION_MEMORY_DETAIL_NATIVE_AD_SLOT =
  'position-memory-detail-native-ad' satisfies AdSlot;

/**
 * The pool every practice module's result screen draws its native card from,
 * rendered in the `link` variant of `native_tile` — the `CardLink` shape that
 * screen already uses for "Related Learning".
 *
 * One slot for every module rather than one per module, which is the first
 * time this registry has shared a pool across placements that are not the
 * same machinery. The reader is the same at all of them: someone who has just
 * finished a drill and is looking at their score. A square-colors solver and
 * a route-planner solver are not, at that moment, two audiences.
 *
 * The cost is stated rather than hidden: attribution is per creative
 * (`withCreativeSubId`), so a shared pool cannot be broken down per module in
 * the network's report, and splitting later does not recover the history from
 * before the split. That trade is worth taking only while no creative has run
 * here — which is now. A module that turns out to deserve its own pitch takes
 * its own slot then, and loses only the undifferentiated numbers it would
 * have had anyway.
 *
 * It does NOT go in the "Related Learning" block. That heading is a promise
 * about what follows, and only two modules pass a `relatedModule` at all, so
 * on most screens the ad would be the only thing under a heading it does not
 * belong to. It sits above that block, labelled by its own chrome.
 */
export const PRACTICE_RESULT_NATIVE_AD_SLOT = 'practice-result-native-ad' satisfies AdSlot;

/**
 * The pool the `/practice` module grid draws its native tile from — the one
 * slot bound to `native_tile`, because it is the one surface whose cards are
 * tiles.
 *
 * Static, like the glossary term lists, and reached the same way: the grid
 * calls `getNativeTileCreatives` rather than `resolveNativeAds`, because
 * reading the viewer would read `cookies()` and `/practice` is prerendered.
 * The `bfc_ads_hidden` cookie and its CSS rule are the entitlement layer.
 */
export const PRACTICE_GRID_NATIVE_AD_SLOT = 'practice-grid-native-ad' satisfies AdSlot;
