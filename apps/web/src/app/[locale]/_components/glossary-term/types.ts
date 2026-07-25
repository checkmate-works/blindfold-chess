/**
 * Lightweight, serializable term data embedded into the SSR HTML for the
 * in-prose glossary term modal.
 *
 * Deliberately excludes heavy fields (example FEN boards, annotations): the
 * modal shows a name + reading + definition preview and links out to the
 * full `/glossary/[slug]` page for everything else. Keeping this small is
 * what lets the guide page ship the preview inline with no measurable
 * payload cost and open the modal with zero client fetch.
 */
export type TermPreview = {
  slug: string;
  /** Canonical display name in the current locale (not the prose surface text). */
  name: string;
  /** Furigana / pronunciation, ja locale only. */
  reading?: string;
  /** Definition in the current locale. */
  definition: string;
  /** Absolute href to the single-term page, e.g. `/en/glossary/tabiya`. */
  href: string;
};
