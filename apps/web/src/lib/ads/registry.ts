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
 * Mirrors the "one registry, everything derives from it" pattern used by
 * `PRACTICE_MODULE_REGISTRY`.
 */

export const AD_KINDS = ['banner', 'native_card'] as const;
export type AdKind = (typeof AD_KINDS)[number];

export function isAdKind(value: string): value is AdKind {
  return (AD_KINDS as readonly string[]).includes(value);
}

/**
 * How a slot with multiple active creatives chooses which one to show.
 * - `priority`: always the top `sort_order` (deterministic).
 * - `rotation`: the feed rotates within a page (per interleave index); a
 *   single fixed slot picks at render time, so an ISR-cached page freezes the
 *   pick until revalidation ("rotates on revalidate"). Passed per call site.
 */
export const AD_SELECTIONS = ['priority', 'rotation'] as const;
export type AdSelection = (typeof AD_SELECTIONS)[number];

type AdSlotConfig = { kind: AdKind; defaultSelection: AdSelection };

/**
 * Slot → config binding. Slots are a fixed set (each needs a code-level
 * renderer + an AdSense fallback), keyed by physical placement. `content-*`
 * mirror the `AdSlotKind` used by the AdSense display components and their
 * reserved dimensions.
 */
export const AD_SLOTS = {
  'content-middle': { kind: 'banner', defaultSelection: 'priority' },
  'content-bottom': { kind: 'banner', defaultSelection: 'priority' },
  'feed-native-ad': { kind: 'native_card', defaultSelection: 'rotation' },
} as const satisfies Record<string, AdSlotConfig>;

export type AdSlot = keyof typeof AD_SLOTS;

export const AD_SLOT_VALUES = Object.keys(AD_SLOTS) as AdSlot[];

export function isAdSlot(value: string): value is AdSlot {
  return Object.prototype.hasOwnProperty.call(AD_SLOTS, value);
}

export function kindForSlot(slot: AdSlot): AdKind {
  return AD_SLOTS[slot].kind;
}

export function selectionForSlot(slot: AdSlot): AdSelection {
  return AD_SLOTS[slot].defaultSelection;
}

/** The one slot the in-feed native ad card reads. */
export const FEED_NATIVE_AD_SLOT = 'feed-native-ad' satisfies AdSlot;

/** Fixed slots whose first-party creative is an image banner. */
export type BannerSlot = 'content-middle' | 'content-bottom';

export const BANNER_SLOTS = [
  'content-middle',
  'content-bottom',
] as const satisfies readonly BannerSlot[];

export function isBannerSlot(slot: AdSlot): slot is BannerSlot {
  return AD_SLOTS[slot].kind === 'banner';
}
