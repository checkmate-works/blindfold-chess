'use client';

import { useId } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { Modal } from './Modal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function AuthPromptModal({ isOpen, onClose }: Props) {
  const t = useTranslations('authPrompt');
  const locale = useLocale();
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="relative space-y-4">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h2 id={titleId} className="text-xl font-bold text-foreground pr-8">
          {t('title')}
        </h2>
        <p id={descriptionId} className="text-muted-foreground">
          {t('description')}
        </p>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/sign-up"
            locale={locale}
            className="block w-full rounded-md px-4 py-2 text-center font-medium shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            onClick={onClose}
          >
            {t('signUpButton')}
          </Link>
          <Link
            href="/sign-in"
            locale={locale}
            className="block w-full rounded-md px-4 py-2 text-center font-medium shadow-sm bg-card border border-border text-foreground hover:bg-muted transition-colors"
            onClick={onClose}
          >
            {t('signInButton')}
          </Link>
        </div>
      </div>
    </Modal>
  );
}
