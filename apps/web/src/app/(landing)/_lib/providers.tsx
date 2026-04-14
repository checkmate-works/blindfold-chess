'use client';

import type { ReactNode } from 'react';

import { ThemeProvider } from '@/lib/theme';

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return <ThemeProvider disableTransitionOnChange>{children}</ThemeProvider>;
}
