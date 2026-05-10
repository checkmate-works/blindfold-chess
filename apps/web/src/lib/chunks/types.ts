/**
 * UI-facing chunk shape used by the puzzle tag picker and detail modal.
 * `label` mirrors `chunks.title` (chunks are not yet localized); having
 * the field named `label` keeps the picker's contract symmetric with
 * `ThemeOption.label`, where the value IS locale-resolved.
 *
 * Distinct from the row shape returned by `getLinkedChunksForPosition`,
 * which preserves the raw `title` column for read-side consumers
 * (detail pages, RelatedTags) that don't go through the picker
 * abstraction.
 */
export type ChunkOption = {
  id: string;
  slug: string;
  label: string;
  representativeFen: string;
  description: string | null;
};
