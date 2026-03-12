'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';

type Props = {
  locale: string;
};

export function DeleteAccountButton({ locale }: Props) {
  const t = useTranslations('deleteAccount');
  const router = useRouter();
  const { signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDeleteClick = () => {
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch('/api/account', { method: 'DELETE' });

      if (!res.ok) {
        setError(t('error'));
        setIsDeleting(false);
        setIsModalOpen(false);
        return;
      }

      await signOut();
      router.push(`/${locale}?toast=account_deleted`);
    } catch {
      setError(t('error'));
      setIsDeleting(false);
      setIsModalOpen(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        onClick={handleDeleteClick}
        disabled={isDeleting}
        className="w-full px-6 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDeleting ? t('deleting') : t('confirmButton')}
      </button>

      <ConfirmationModal
        isOpen={isModalOpen}
        title={t('confirmTitle')}
        message={t('confirmMessage')}
        confirmText={t('confirmOk')}
        cancelText={t('confirmCancel')}
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
