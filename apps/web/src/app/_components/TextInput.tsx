import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className = '', type = 'text', ...props }: Props) {
  return (
    <input
      type={type}
      className={`w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ${className}`.trim()}
      {...props}
    />
  );
}
