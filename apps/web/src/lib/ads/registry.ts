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
 * Slot → kind binding. Slots are a fixed set because each one needs a
 * code-level renderer anyway; the admin picks a slot from this map rather
 * than typing a free string, which is what keeps `slot`/`kind` consistent.
 */
export const AD_SLOTS = {
  'feed-native-ad': { kind: 'native_card' },
  'banner-wide': { kind: 'banner' },
  'banner-standard': { kind: 'banner' },
} as const satisfies Record<string, { kind: AdKind }>;

export type AdSlot = keyof typeof AD_SLOTS;

export const AD_SLOT_VALUES = Object.keys(AD_SLOTS) as AdSlot[];

export function isAdSlot(value: string): value is AdSlot {
  return Object.prototype.hasOwnProperty.call(AD_SLOTS, value);
}

export function kindForSlot(slot: AdSlot): AdKind {
  return AD_SLOTS[slot].kind;
}

/** The one slot the in-feed native ad card reads. */
export const FEED_NATIVE_AD_SLOT = 'feed-native-ad' satisfies AdSlot;
