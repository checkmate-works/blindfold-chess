/**
 * `contentStyle` for a Recharts `<Tooltip>`, so the hover card is painted from
 * the app's theme tokens instead of Recharts' own light-only defaults.
 *
 * Recharts renders the tooltip as an inline-styled div outside the Tailwind
 * class system, which is why this has to be an object rather than a class
 * name — and why every chart had its own copy. Four of them did, identically,
 * and a copy that missed the dark-mode tokens would show black-on-black.
 */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  color: 'var(--color-foreground)',
} as const;
