/**
 * Single source of truth for self-served ad slots and their creative kinds.
 *
 * Every ad slot (placement) accepts exactly one creative `kind`. The DB
 * (`ad_creatives`) cannot express that constraint — `slot` and `kind` are
 * just varchars — so writes validate against this registry, and readers
 * derive the payload type from the slot's kind. Adding a new placement or
 * format starts here: add the slot (and, for a new format, the `kind`),
 * then add its payload type/guard (`@/lib/ads/payload`) and a renderer.
 *
 * There are two kinds, because there are two card shapes to blend into.
 * `native_card` is a row in a list — a feed item, a post, a glossary term.
 * `native_tile` is a cell in the `/practice` grid, where the neighbours are
 * module tiles with an emoji, a title and an example band and a row-shaped
 * card would be the only thing on the page that is not a tile.
 *
 * A third kind is the answer whenever a new surface's cards are a third
 * shape. It is a payload type and guard (`@/lib/ads/payload`), a renderer,
 * a branch in the admin's payload validator, and an authoring form — the
 * type system names the first two for you, since `PAYLOAD_GUARDS` and
 * `AdPayloadByKind` are keyed by `AdKind`, but the admin pages pick their
 * form from the slot's kind at runtime and will not.
 *
 * Mirrors the "one registry, everything derives from it" pattern used by
 * `PRACTICE_MODULE_REGISTRY`.
 */

export const AD_KINDS = ['native_card', 'native_tile'] as const;
export type AdKind = (typeof AD_KINDS)[number];

export function isAdKind(value: string): value is AdKind {
  return (AD_KINDS as readonly string[]).includes(value);
}

type AdSlotConfig = { kind: AdKind };

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
  'feed-native-ad': { kind: 'native_card' },
  'topic-catalog-native-ad': { kind: 'native_card' },
  'topic-detail-native-ad': { kind: 'native_card' },
  'glossary-term-list-native-ad': { kind: 'native_card' },
  'practice-grid-native-ad': { kind: 'native_tile' },
  'puzzle-list-native-ad': { kind: 'native_card' },
  'position-memory-list-native-ad': { kind: 'native_card' },
} as const satisfies Record<string, AdSlotConfig>;

export type AdSlot = keyof typeof AD_SLOTS;

export const AD_SLOT_VALUES = Object.keys(AD_SLOTS) as AdSlot[];

export function isAdSlot(value: string): value is AdSlot {
  return Object.prototype.hasOwnProperty.call(AD_SLOTS, value);
}

export function kindForSlot(slot: AdSlot): AdKind {
  return AD_SLOTS[slot].kind;
}

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
