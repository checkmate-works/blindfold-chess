import type { Ref } from 'react';

type Props = {
  message: string | null;
  /**
   * Visual variant:
   * - 'inline' (default): simple rounded banner, left-aligned text
   * - 'bordered': adds a border and centers the text
   * - 'soft': theme-token fill (`destructive-soft`), left-aligned. Used by
   *   the UGC authoring flows (chunks / puzzle / position memory).
   */
  variant?: 'inline' | 'bordered' | 'soft';
  /**
   * Focus target for `useSubmitError`. Pass its `summaryRef` when this
   * banner carries submit errors: the strip is then focused (and scrolled
   * to) on a failed submit instead of sitting off-screen above a long
   * form, where a rejected submit reads as an unresponsive button.
   */
  ref?: Ref<HTMLDivElement>;
};

/**
 * Form-level error banner: the surface for errors no single control owns
 * (a server rejection, a failed local draft write). Errors attributable to
 * one control belong at that control instead — see `FieldError` — so the
 * two never show the same sentence twice.
 *
 * Renders nothing when message is null/empty.
 */
export function FormErrorBanner({ message, variant = 'inline', ref }: Props) {
  if (!message) return null;

  // `tabIndex` makes it programmatically focusable without adding it to
  // the tab order; `role="alert"` announces it when it appears.
  const shared = { ref, tabIndex: -1, role: 'alert' } as const;

  if (variant === 'bordered') {
    return (
      <div
        {...shared}
        className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center"
      >
        <p className="text-sm text-destructive">{message}</p>
      </div>
    );
  }

  if (variant === 'soft') {
    return (
      <div
        {...shared}
        className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm"
      >
        {message}
      </div>
    );
  }

  return (
    <div {...shared} className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
      {message}
    </div>
  );
}
