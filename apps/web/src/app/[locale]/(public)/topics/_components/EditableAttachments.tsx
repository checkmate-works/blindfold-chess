'use client';

import { useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaTimes } from 'react-icons/fa';

import type { PostAttachment } from '@/lib/games/get-attachments-for-posts';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import type { AttachmentKind } from '../_actions/removePostAttachment';
import { AttachedEmbedCard } from './AttachedEmbedCard';
import { AttachedFenCard } from './AttachedFenCard';
import { AttachedGameCard } from './AttachedGameCard';
import { AttachedVideoCard } from './AttachedVideoCard';

type RemoveAttachmentAction = (
  postId: string,
  attachmentId: string,
  kind: AttachmentKind,
  locale: string
) => Promise<{ success: true } | { error: string }>;

type Props = {
  postId: string;
  locale: string;
  /** Current attachment for this post, or `null` if none. */
  attachment: PostAttachment | null;
  removeAttachmentAction: RemoveAttachmentAction;
  fallbackVideoTitle: string;
};

/**
 * Edit-mode view of a topic_post's attachment row. Renders the same Attached*
 * card the read view would, then adds:
 *   - a "Remove attachment" button under the card for 1:0..1 kinds
 *     (pgn / embed / fen / video)
 *   - a per-image `×` overlay button on each thumbnail for the 1:N image kind
 *
 * Local state mirrors the server-side attachment list: on a successful
 * `removeAttachmentAction` call the component drops the corresponding row
 * (or clears the whole attachment for 1:0..1 kinds) so the UI reflects the
 * change without a router round-trip. The confirmation modal stays on the
 * non-image kinds because removing a hand-typed PGN or a curated FEN is a
 * costlier mistake than removing a single image — images get a single click
 * to remove, balancing convenience against the typo cost.
 */
export function EditableAttachments({
  postId,
  locale,
  attachment,
  removeAttachmentAction,
  fallbackVideoTitle,
}: Props) {
  const t = useTranslations('topics.removeAttachment');

  const [local, setLocal] = useState<PostAttachment | null>(attachment);
  const [pendingConfirm, setPendingConfirm] = useState<{ id: string; kind: AttachmentKind } | null>(
    null
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!local) return null;

  async function performRemove(attachmentId: string, kind: AttachmentKind) {
    setIsPending(true);
    setError(null);
    const result = await removeAttachmentAction(postId, attachmentId, kind, locale);
    setIsPending(false);
    if ('error' in result) {
      const key = t.has(result.error) ? result.error : 'error';
      setError(t(key));
      return;
    }
    setPendingConfirm(null);
    // The 1:0..1 kinds disappear entirely; for images, drop the matching
    // row from the list so the remaining thumbnails stay rendered.
    setLocal((prev) => {
      if (!prev) return prev;
      if (prev.kind === 'image') {
        const next = prev.data.filter((img) => img.id !== attachmentId);
        return next.length === 0 ? null : { kind: 'image', data: next };
      }
      return null;
    });
  }

  if (local.kind === 'image') {
    return (
      <div className="mt-2 mb-2 rounded-md border border-border bg-card overflow-hidden">
        <div className="p-3">
          <ul
            className={
              local.data.length === 1
                ? 'grid grid-cols-1 gap-2'
                : 'grid grid-cols-2 sm:grid-cols-3 gap-2'
            }
          >
            {local.data.map((image, index) => (
              <li key={image.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.publicUrl}
                  alt={image.altText ?? ''}
                  width={image.width}
                  height={image.height}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto rounded-sm border border-border bg-muted object-cover"
                />
                <button
                  type="button"
                  onClick={() => void performRemove(image.id, 'image')}
                  disabled={isPending}
                  aria-label={t('removeImageAriaLabel', { index: index + 1 })}
                  className="absolute top-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground shadow ring-1 ring-border hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaTimes aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    );
  }

  // 1:0..1 kinds — render the read card and a confirm-then-remove affordance.
  const card =
    local.kind === 'pgn' ? (
      <AttachedGameCard attachment={local.data} />
    ) : local.kind === 'embed' ? (
      <AttachedEmbedCard attachment={local.data} />
    ) : local.kind === 'fen' ? (
      <AttachedFenCard attachment={local.data} />
    ) : (
      <AttachedVideoCard attachment={local.data} fallbackTitle={fallbackVideoTitle} />
    );

  const attachmentId = local.data.id;
  const kind = local.kind;

  return (
    <div>
      {card}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPendingConfirm({ id: attachmentId, kind })}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
        >
          <FaTimes aria-hidden="true" className="h-3 w-3" />
          {t('button')}
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <ConfirmationModal
        isOpen={pendingConfirm !== null}
        title={t('confirmTitle')}
        message={t('confirmMessage')}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        isLoading={isPending}
        error={error}
        onConfirm={() => {
          if (pendingConfirm) void performRemove(pendingConfirm.id, pendingConfirm.kind);
        }}
        onCancel={() => {
          if (!isPending) {
            setPendingConfirm(null);
            setError(null);
          }
        }}
      />
    </div>
  );
}
