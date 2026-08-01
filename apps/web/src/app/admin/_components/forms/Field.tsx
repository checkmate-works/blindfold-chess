import type { ReactNode } from 'react';

import { FieldError } from '@/app/_components/FieldError';

/**
 * Label + control wrapper for admin forms. Owns the `<label>` markup and
 * vertical spacing so every field block looks identical; the control itself
 * ({@link Input}, {@link Textarea}, a raw `<select>`, …) is passed as children.
 *
 * Accessibility is explicit, not magic: pass matching `htmlFor` / control `id`.
 * Pure presentational (no hooks).
 */
type FieldProps = {
  label: ReactNode;
  htmlFor: string;
  /** Optional helper text rendered under the control. */
  description?: ReactNode;
  /**
   * A rejection this field owns, rendered under the control with the id
   * `<htmlFor>-error`. Give the control `invalid` and `aria-describedby`
   * pointing at that id (see `fieldErrorProps`) so the two agree.
   */
  error?: string | null;
  children: ReactNode;
};

export function Field({ label, htmlFor, description, error = null, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">
        {label}
      </label>
      {children}
      <FieldError id={`${htmlFor}-error`} message={error} />
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
