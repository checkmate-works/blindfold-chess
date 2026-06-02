'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

import { getSharedGameByPublishedId, removeSharedGame } from '@/lib/games/shared-game-store';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteSharedGameAction } from '../_actions/manage-shared-game';

type Props = {
  gameId: string;
  /** Whether the signed-in viewer owns this game via author_id. */
  isRegisteredOwner: boolean;
  locale: string;
};

/**
 * Owner-only edit / delete controls for a shared game, rendered as a subtle
 * inline row matching the chunk / position UGC pages. Ownership is dual:
 * registered authors are flagged server-side (`isRegisteredOwner`); account-less
 * authors are detected client-side by the manage token this browser stored at
 * publish time. Edit links to a dedicated page; delete soft-deletes here.
 */
export function OwnerActions({ gameId, isRegisteredOwner, locale }: Props) {
  const t = useTranslations('sharedGames');
  const router = useRouter();

  // This browser's local record: token (if any) authorizes account-less delete,
  // and localGameId lets us clear the record so the result screen stops linking
  // to the deleted game. Registered authors who published here have a record too.
  const [localGameId, setLocalGameId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const found = getSharedGameByPublishedId(gameId);
    if (found) {
      setLocalGameId(found.localGameId);
      setToken(found.record.manageToken ?? null);
    }
  }, [gameId]);

  const isOwner = isRegisteredOwner || token != null;
  if (!isOwner) return null;

  async function handleDelete() {
    setConfirmOpen(false);
    setPending(true);
    setError(null);
    const res = await deleteSharedGameAction(gameId, token ?? undefined);
    setPending(false);
    if (!res.success) {
      setError(
        res.error === 'forbidden' ? t('detail.errors.forbidden') : t('detail.errors.generic')
      );
      return;
    }
    if (localGameId) removeSharedGame(localGameId);
    router.push(`/${locale}/games/shared`);
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-4 text-xs text-muted-foreground">
      <Link
        href={`/${locale}/games/shared/${gameId}/edit`}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 transition-colors hover:border-foreground/20 hover:text-foreground"
      >
        <FiEdit2 className="h-3 w-3" aria-hidden />
        {t('detail.edit')}
      </Link>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirmOpen(true);
        }}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
      >
        <FiTrash2 className="h-3 w-3" aria-hidden />
        {pending ? t('detail.deleting') : t('detail.delete')}
      </button>
      {error && <span className="text-destructive">{error}</span>}

      <ConfirmationModal
        isOpen={confirmOpen}
        title={t('detail.deleteConfirmTitle')}
        message={t('detail.deleteConfirmBody')}
        confirmText={t('detail.delete')}
        cancelText={t('detail.cancel')}
        confirmVariant="danger"
        isLoading={pending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
