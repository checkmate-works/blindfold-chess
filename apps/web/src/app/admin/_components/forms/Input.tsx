import type { InputHTMLAttributes } from 'react';

import { type FieldControlOptions, fieldControlClass } from './field-control-class';

/**
 * Canonical admin text/number input. Pure presentational (no hooks) — usable
 * from server or client forms, and state-agnostic: works with controlled
 * (`value`/`onChange`) and uncontrolled (`defaultValue` + FormData) parents
 * alike, since every native prop forwards.
 *
 * See {@link fieldControlClass} for the `surface` / `fullWidth` options.
 */
type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldControlOptions;

export function Input({ className, surface, fullWidth, invalid, ...props }: InputProps) {
  return (
    <input className={fieldControlClass({ surface, fullWidth, invalid, className })} {...props} />
  );
}
