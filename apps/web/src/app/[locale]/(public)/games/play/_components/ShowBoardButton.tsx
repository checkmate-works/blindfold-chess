'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaEye } from 'react-icons/fa';

type Props = {
  onClick: () => void;
  disabled?: boolean;
};

export function ShowBoardButton({ onClick, disabled }: Props) {
  const t = useTranslations('play');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      title={t('showBoard')}
    >
      <FaEye className="w-4 h-4" />
      <span className="hidden md:inline">{t('showBoard')}</span>
    </button>
  );
}
