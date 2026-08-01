import type { InputHTMLAttributes } from 'react';

import {
  INPUT_BASE_CLASSES,
  INPUT_SM_CLASSES,
  type InputSize,
  invalidBorderClasses,
} from './inputStyles';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  inputSize?: InputSize;
  /**
   * Holds a validation error: turns the border red. Pair it with `FieldError`
   * and `fieldErrorProps` so the reason is stated, not just signalled by
   * colour.
   */
  invalid?: boolean;
};

export function TextInput({
  className = '',
  type = 'text',
  inputSize = 'md',
  invalid = false,
  ...props
}: Props) {
  const baseClasses = invalidBorderClasses(
    inputSize === 'sm' ? INPUT_SM_CLASSES : INPUT_BASE_CLASSES,
    invalid
  );
  return <input type={type} className={`${baseClasses} ${className}`.trim()} {...props} />;
}
