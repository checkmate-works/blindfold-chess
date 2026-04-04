'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

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
      <Button
        type="button"
        variant="destructive"
        size="lg"
        fullWidth
        loading={isDeleting}
        onClick={handleDeleteClick}
      >
        {t('confirmButton')}
      </Button>

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
