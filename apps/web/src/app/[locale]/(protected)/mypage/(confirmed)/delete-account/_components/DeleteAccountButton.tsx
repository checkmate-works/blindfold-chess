'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

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

  const handleDelete = async () => {
    const confirmed = window.confirm(`${t('confirmTitle')}\n\n${t('confirmMessage')}`);
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch('/api/account', { method: 'DELETE' });

      if (!res.ok) {
        setError(t('error'));
        setIsDeleting(false);
        return;
      }

      await signOut();
      router.push(`/${locale}`);
    } catch {
      setError(t('error'));
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="w-full px-6 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDeleting ? t('deleting') : t('confirmButton')}
      </button>
    </div>
  );
}
