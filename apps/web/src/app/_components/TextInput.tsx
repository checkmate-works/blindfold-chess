import type { InputHTMLAttributes } from 'react';

import { INPUT_BASE_CLASSES, INPUT_SM_CLASSES, type InputSize } from './inputStyles';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  inputSize?: InputSize;
};

export function TextInput({ className = '', type = 'text', inputSize = 'md', ...props }: Props) {
  const baseClasses = inputSize === 'sm' ? INPUT_SM_CLASSES : INPUT_BASE_CLASSES;
  return <input type={type} className={`${baseClasses} ${className}`.trim()} {...props} />;
}
