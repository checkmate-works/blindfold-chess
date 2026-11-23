/**
 * The visibility tiers a Kata (repertoire) can be published at, most open
 * first. `building` is a lifecycle state (an unpublished draft), NOT a chosen
 * visibility, so it is deliberately absent — a repertoire's `status` column is
 * `'building' | RepertoireVisibility`.
 *
 * Every tier is free to choose and the owner can move among them at will; the
 * tiers differ only in WHO may view the course (followers-only → owner +
 * followers; private → owner only), enforced at the read path.
 *
 * A pure leaf with no server-only imports: the create form and the visibility
 * control import it into client bundles.
 */
export const REPERTOIRE_VISIBILITIES = ['public', 'followers_only', 'private'] as const;
export type RepertoireVisibility = (typeof REPERTOIRE_VISIBILITIES)[number];

export function isRepertoireVisibility(v: string): v is RepertoireVisibility {
  return (REPERTOIRE_VISIBILITIES as readonly string[]).includes(v);
}
