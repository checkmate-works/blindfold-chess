import type { Metadata } from 'next';

export const noIndexMetadata: Metadata = {
  robots: { index: false },
};

export function NoIndexLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
