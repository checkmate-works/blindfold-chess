/**
 * Resolve persisted option IDs (from a draft or fork seed) back into full
 * option objects using the server-loaded catalog, preserving the stored
 * order. IDs missing from the catalog (e.g. a chunk soft-deleted between
 * draft write and hydration) silently drop.
 */
export function resolveOptionsByIds<T extends { id: string }>(ids: string[], options: T[]): T[] {
  return ids.flatMap((id) => {
    const found = options.find((option) => option.id === id);
    return found ? [found] : [];
  });
}
