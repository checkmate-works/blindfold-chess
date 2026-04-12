import type { ReactNode } from 'react';

import { IconShortcutCard } from './IconShortcutCard';

type Props = {
  locale: string;
  href: string;
  label: string;
  icon: ReactNode;
};

export function ChallengeCard({ locale, href, label, icon }: Props) {
  return <IconShortcutCard href={`/${locale}${href}`} label={label} icon={icon} />;
}
