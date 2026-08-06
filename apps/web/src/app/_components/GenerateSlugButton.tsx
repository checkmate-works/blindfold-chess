import { deriveSlugFromTitle } from '@/lib/validations/slug';

type GenerateSlugButtonProps = {
  /** Current value of the title input the slug is derived from. */
  title: string;
  /** Receives the derived slug; only called with a non-empty value. */
  onSlugChange: (slug: string) => void;
  /** Localized button label (e.g. "Generate from title"). */
  label: string;
  /** Extra disable condition on top of "the title yields no slug". */
  disabled?: boolean;
  /** Control height: `md` matches the chunk form, `sm` the admin slug row. */
  size?: keyof typeof SIZE_CLASS;
};

const BASE_CLASS =
  'px-3 text-sm rounded border border-border bg-muted text-foreground hover:opacity-80 disabled:opacity-50 transition-opacity whitespace-nowrap';

const SIZE_CLASS = {
  sm: 'py-1.5',
  md: 'py-2',
} as const;

/**
 * "Generate from title" helper rendered next to a slug input.
 *
 * Shared by the chunk authoring form and the admin article / announcement
 * forms so all three derive slugs identically (see `deriveSlugFromTitle`).
 *
 * The button disables itself whenever the title derives to `""` — an empty
 * title, but also a fully non-Latin one such as a Japanese article title,
 * where the derivation has nothing to work with. Without that guard the
 * click would silently wipe whatever slug the author had already typed.
 *
 * Pure presentational: the label is passed in rather than read from a
 * namespace, because the admin forms take their strings as a `labels` object
 * while the chunk form reads `chunks.form` directly.
 */
export function GenerateSlugButton({
  title,
  onSlugChange,
  label,
  disabled = false,
  size = 'md',
}: GenerateSlugButtonProps) {
  const derived = deriveSlugFromTitle(title);

  return (
    <button
      type="button"
      onClick={() => onSlugChange(derived)}
      disabled={disabled || derived === ''}
      className={`${BASE_CLASS} ${SIZE_CLASS[size]}`}
    >
      {label}
    </button>
  );
}
