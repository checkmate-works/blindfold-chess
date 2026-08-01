import type { TextareaHTMLAttributes } from 'react';

import { type FieldControlOptions, fieldControlClass } from './field-control-class';

/**
 * Multi-line variant of {@link Input}, sharing the exact same field styling so
 * single-line and multi-line controls line up on a form. Pure presentational
 * and state-agnostic.
 */
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldControlOptions;

export function Textarea({ className, surface, fullWidth, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      className={fieldControlClass({ surface, fullWidth, invalid, className })}
      {...props}
    />
  );
}
