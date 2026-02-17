import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false },
};

export default function LimitReachedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
