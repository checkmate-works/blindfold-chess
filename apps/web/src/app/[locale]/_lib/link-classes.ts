/**
 * Canonical text-link affordance strings, shared across the web app.
 *
 * Why this exists: hover-only affordance (e.g. `hover:underline`) is invisible
 * on touch devices — links styled that way read as plain text on mobile. The
 * classes below make the link affordance persistent (underline at rest, color
 * shift on hover, focus-visible ring for keyboard users) so the link nature is
 * apparent on every input modality.
 *
 * Use at ordinary text-link sites. For decorative labels inside a card that is
 * itself the click target (e.g. "Show more" spans inside a clickable feed
 * row), do NOT apply these — let the card handle the affordance.
 */

/** Focus-visible ring treatment, exported for reuse on non-text-link targets
 * (e.g. full-row card links that need the same keyboard affordance without a
 * persistent underline). */
export const FOCUS_RING_CLASSES =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const LINK_BASE = `rounded-sm underline decoration-1 underline-offset-2 transition-colors hover:decoration-2 ${FOCUS_RING_CLASSES}`;

/** Default text-link treatment — link-primary color, persistent underline. */
export const TEXT_LINK_CLASSES = `text-link-primary hover:text-link-primary/80 ${LINK_BASE}`;

/** Low-emphasis variant for footer-style / auxiliary links. */
export const TEXT_LINK_MUTED_CLASSES = `text-muted-foreground hover:text-foreground ${LINK_BASE}`;

/** Destructive variant for action-like links (e.g. delete account). */
export const TEXT_LINK_DESTRUCTIVE_CLASSES = `text-destructive hover:text-destructive/80 ${LINK_BASE}`;

/**
 * The timestamp / permalink affordance inside an activity card.
 *
 * Hover-only on purpose, unlike {@link TEXT_LINK_CLASSES}: the card itself
 * is the click target, so a persistent underline on the timestamp would read
 * as a second, competing link. Eight cards spelled this string out and four
 * more prefixed it with their own color and size, which is how a focus ring
 * ends up on some cards and not others.
 */
export const CARD_PERMALINK_CLASSES =
  'hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm';
