import { IconShortcutCard } from '@/app/_components/IconShortcutCard';
import { FaPlus } from 'react-icons/fa';

type Props = {
  locale: string;
  label: string;
};

export function NewGameCard({ locale, label }: Props) {
  return (
    <IconShortcutCard
      href={`/${locale}/games/new`}
      label={label}
      icon={<FaPlus className="text-primary" size={20} />}
    />
  );
}
