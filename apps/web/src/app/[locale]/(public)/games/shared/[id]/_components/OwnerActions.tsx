'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

import { getSharedGameByPublishedId, removeSharedGame } from '@/lib/games/shared-game-store';

import { ActionsMenu, ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteSharedGameAction } from '../_actions/manage-shared-game';

type Props = {
  gameId: string;
  /** Whether the signed-in viewer owns this game via author_id. */
  isRegisteredOwner: boolean;
  locale: string;
};

/**
 * Owner-only "⋯" overflow menu (edit / delete) for a shared game, matching
 * the chunk / position UGC pages. Ownership is dual: registered authors are
 * flagged server-side (`isRegisteredOwner`); account-less authors are
 * detected client-side by the manage token this browser stored at publish
 * time — which is why the whole menu (trigger included) is client-rendered
 * and returns null for non-owners. Edit links to a dedicated page; delete
 * soft-deletes here. On failure the confirmation modal stays open and shows
 * the error.
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
    setConfirmOpen(false);
    if (localGameId) removeSharedGame(localGameId);
    router.push(`/${locale}/games/shared`);
  }

  return (
    <>
      <ActionsMenu
        ariaLabel={t('detail.moreActions')}
        items={[
          {
            key: 'edit',
            label: t('detail.edit'),
            href: `/${locale}/games/shared/${gameId}/edit`,
            icon: <FiEdit2 className="h-4 w-4" aria-hidden />,
          },
        ]}
      >
        <ActionsMenuButton
          tone="danger"
          onClick={() => {
            setError(null);
            setConfirmOpen(true);
          }}
          disabled={pending}
        >
          <FiTrash2 className="h-4 w-4" aria-hidden />
          {pending ? t('detail.deleting') : t('detail.delete')}
        </ActionsMenuButton>
      </ActionsMenu>

      <ConfirmationModal
        isOpen={confirmOpen}
        title={t('detail.deleteConfirmTitle')}
        message={t('detail.deleteConfirmBody')}
        error={error}
        confirmText={t('detail.delete')}
        cancelText={t('detail.cancel')}
        confirmVariant="danger"
        isLoading={pending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
