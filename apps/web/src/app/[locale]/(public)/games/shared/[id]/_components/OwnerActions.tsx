'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '@/lib/games/publish-constants';
import { getSharedGameByPublishedId, removeSharedGame } from '@/lib/games/shared-game-store';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import { deleteSharedGameAction, updateSharedGameAction } from '../_actions/manage-shared-game';

type Props = {
  gameId: string;
  /** Whether the signed-in viewer owns this game via author_id. */
  isRegisteredOwner: boolean;
  initialTitle: string;
  initialDescription: string;
  locale: string;
};

/**
 * Owner-only edit / delete controls for a shared game, rendered as a subtle
 * inline row matching the chunk / position UGC pages. Ownership is dual:
 * registered authors are flagged server-side (`isRegisteredOwner`); account-less
 * authors are detected client-side by the manage token this browser stored at
 * publish time. Edit (title / description) and delete both authorize against
 * either path server-side.
 */
export function OwnerActions({
  gameId,
  isRegisteredOwner,
  initialTitle,
  initialDescription,
  locale,
}: Props) {
  const t = useTranslations('sharedGames');
  const router = useRouter();

  // Account-less ownership (token from localStorage), resolved after mount.
  const [localGameId, setLocalGameId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    // Resolve this browser's local record regardless of registered/anonymous
    // ownership: the token (if any) authorizes account-less mutations, and the
    // localGameId is needed to clean up the shared-game store on delete — so the
    // result screen stops linking to the now-deleted game. Registered authors
    // who published from this browser have a record too (without a token).
    const found = getSharedGameByPublishedId(gameId);
    if (found) {
      setLocalGameId(found.localGameId);
      setToken(found.record.manageToken ?? null);
    }
  }, [gameId]);

  const isOwner = isRegisteredOwner || token != null;
  if (!isOwner) return null;

  const localizeError = (code: string) =>
    code === 'forbidden' ? t('detail.errors.forbidden') : t('detail.errors.generic');

  async function handleDelete() {
    setConfirmOpen(false);
    setPending(true);
    setError(null);
    const res = await deleteSharedGameAction(gameId, token ?? undefined);
    setPending(false);
    if (!res.success) {
      setError(localizeError(res.error));
      return;
    }
    if (localGameId) removeSharedGame(localGameId);
    router.push(`/${locale}/games/shared`);
  }

  async function handleSave() {
    const trimmed = title.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_TITLE_LENGTH) {
      setError(t('detail.errors.generic'));
      return;
    }
    setPending(true);
    setError(null);
    const res = await updateSharedGameAction({
      gameId,
      title: trimmed,
      description: description.trim() || null,
      token: token ?? undefined,
    });
    setPending(false);
    if (!res.success) {
      setError(localizeError(res.error));
      return;
    }
    setEditOpen(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-4 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={() => {
          setTitle(initialTitle);
          setDescription(initialDescription);
          setError(null);
          setEditOpen(true);
        }}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 transition-colors hover:border-foreground/20 hover:text-foreground"
      >
        <FiEdit2 className="h-3 w-3" aria-hidden />
        {t('detail.edit')}
      </button>
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
      {error && !editOpen && <span className="text-destructive">{error}</span>}

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

      <ConfirmationModal
        isOpen={editOpen}
        title={t('edit.title')}
        confirmText={pending ? t('edit.submitting') : t('edit.submit')}
        cancelText={t('detail.cancel')}
        confirmVariant="primary"
        isLoading={pending}
        error={error}
        onConfirm={handleSave}
        onCancel={() => setEditOpen(false)}
      >
        <div className="space-y-3 text-left">
          <div className="space-y-1.5">
            <label htmlFor="edit-game-title" className="block text-sm font-medium text-foreground">
              {t('new.titleLabel')}
            </label>
            <input
              id="edit-game-title"
              type="text"
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="edit-game-description"
              className="block text-sm font-medium text-foreground"
            >
              {t('new.descriptionLabel')}
            </label>
            <textarea
              id="edit-game-description"
              value={description}
              maxLength={MAX_DESCRIPTION_LENGTH}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
}
