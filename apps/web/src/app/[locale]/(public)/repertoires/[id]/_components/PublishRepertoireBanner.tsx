'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { publishRepertoire } from '../_actions/publishRepertoire';

type Props = {
  id: string;
  locale: string;
  /** Live line count — publishing needs at least one. */
  lineCount: number;
};

/**
 * Owner-only banner shown while a repertoire is `building`: explains the
 * in-progress state and, once it has at least one line, offers the one-way
 * "publish" action behind a confirmation (no path back to `building`
 * afterward — see `publishRepertoireEntry`). On success, `router.refresh()`
 * re-fetches the page's server data so the banner and chip disappear without
 * a full navigation.
 */
export function PublishRepertoireBanner({ id, locale, lineCount }: Props) {
  const t = useTranslations('Repertoires');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPublish = lineCount >= 1;

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const result = await publishRepertoire({ id, locale });
    if ('error' in result) {
      setPending(false);
      setError(t('publish.errors.generic'));
      return;
    }
    setPending(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-warning bg-warning/5 p-4 space-y-2">
      <p className="text-sm font-medium text-foreground">{t('publish.bannerTitle')}</p>
      <p className="text-sm text-muted-foreground">
        {canPublish ? t('publish.bannerDescription') : t('publish.needsLine')}
      </p>
      <Button variant="primary" onClick={() => setOpen(true)} disabled={!canPublish}>
        {t('publish.button')}
      </Button>
      <ConfirmationModal
        isOpen={open}
        title={t('publish.confirmTitle')}
        message={t('publish.confirmMessage')}
        error={error}
        confirmText={t('publish.confirm')}
        cancelText={t('publish.cancel')}
        confirmVariant="primary"
        isLoading={pending}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
