import type { ReactNode } from 'react';

import { IconShortcutCard } from './IconShortcutCard';

type Props = {
  locale: string;
  href: string;
  label: string;
  icon: ReactNode;
  /** Optional overlay node (e.g. rank badge) positioned over the icon. */
  overlay?: ReactNode;
};

export function ChallengeCard({ locale, href, label, icon, overlay }: Props) {
  return (
    <IconShortcutCard href={`/${locale}${href}`} label={label} icon={icon} overlay={overlay} />
  );
}
