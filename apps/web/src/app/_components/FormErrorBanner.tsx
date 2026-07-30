import type { Ref } from 'react';

type Props = {
  message: string | null;
  /**
   * Layout variant. Both share the `destructive-soft` theme-token fill —
   * there is one error colour in this app, defined once in
   * `@blindfold-chess/ui`.
   *
   * - 'inline' (default): left-aligned strip above a form's fields
   * - 'bordered': bordered and centered, for the narrow auth cards
   */
  variant?: 'inline' | 'bordered';
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
  const fill = 'bg-destructive-soft text-destructive-soft-foreground text-sm';

  if (variant === 'bordered') {
    return (
      <div
        {...shared}
        className={`p-3 rounded-lg border border-destructive/20 text-center ${fill}`}
      >
        {message}
      </div>
    );
  }

  return (
    <div {...shared} className={`p-3 rounded-md ${fill}`}>
      {message}
    </div>
  );
}
