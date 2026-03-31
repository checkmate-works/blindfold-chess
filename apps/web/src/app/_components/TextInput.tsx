import type { InputHTMLAttributes } from 'react';

import { INPUT_BASE_CLASSES } from './inputStyles';

type Props = InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className = '', type = 'text', ...props }: Props) {
  return <input type={type} className={`${INPUT_BASE_CLASSES} ${className}`.trim()} {...props} />;
}
