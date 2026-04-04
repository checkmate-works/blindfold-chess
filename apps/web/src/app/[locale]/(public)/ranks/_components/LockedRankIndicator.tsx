'use client';

import { useCallback, useState } from 'react';

import Link from 'next/link';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { HiLockClosed } from 'react-icons/hi2';

import { Modal } from '@/app/[locale]/_components/Modal';

type Props = {
  locale: string;
  previousRankName: string;
  previousSlug: string;
};

export function LockedRankIndicator({ locale, previousRankName, previousSlug }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('ranks.lockedModal');

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(true);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="ml-auto shrink-0 p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={t('ariaLabel')}
      >
        <HiLockClosed className="size-6" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        maxWidth="max-w-sm"
        title={t('title')}
      >
        <div className="text-center">
          <p className="text-foreground">{t('message', { rankName: previousRankName })}</p>
          <div className="mt-4">
            <Link
              href={`/${locale}/ranks/${previousSlug}`}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('linkLabel', { rankName: previousRankName })}
            </Link>
          </div>
        </div>
      </Modal>
    </>
  );
}
