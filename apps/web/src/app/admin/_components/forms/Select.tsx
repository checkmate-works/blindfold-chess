import type { SelectHTMLAttributes } from 'react';

import { type FieldControlOptions, fieldControlClass } from './field-control-class';

/**
 * Dropdown sharing the exact field styling of {@link Input}, so selects and
 * text inputs line up on a form. Options are passed as children. Pure
 * presentational and state-agnostic.
 */
type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldControlOptions;

export function Select({ className, surface, fullWidth, invalid, ...props }: SelectProps) {
  return (
    <select className={fieldControlClass({ surface, fullWidth, invalid, className })} {...props} />
  );
}
