'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPaperclip, FaTimes } from 'react-icons/fa';

import type { PostAttachment } from '@/lib/games/get-attachments-for-posts';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';

import type { AttachmentKind } from '../_actions/removePostAttachment';
import type { AttachAction, RemoveAttachmentAction } from '../_lib/action-types';
import { AttachedEmbedCard } from './AttachedEmbedCard';
import { AttachedFenCard } from './AttachedFenCard';
import { AttachedGameCard } from './AttachedGameCard';
import { AttachedVideoCard } from './AttachedVideoCard';
import type { AggregatedAttachmentMode } from './AttachmentModal';
import { AttachmentModal } from './AttachmentModal';

type Props = {
  postId: string;
  locale: string;
  /** Current attachment for this post, or `null` if none. */
  attachment: PostAttachment | null;
  removeAttachmentAction: RemoveAttachmentAction;
  /**
   * Optional attach actions. When present, the component surfaces an
   * "Add attachment" affordance whenever the post has no current
   * attachment — clicking it opens `AttachmentModal` and routes the
   * selected kind to the matching action. Omitting both keeps the
   * component remove-only (Phase 2A contract).
   */
  attachPgnAction?: AttachAction;
  attachFenAction?: AttachAction;
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
  attachPgnAction,
  attachFenAction,
  fallbackVideoTitle,
}: Props) {
  const t = useTranslations('topics.removeAttachment');
  const tAdd = useTranslations('topics.addAttachment');
  const router = useRouter();

  const [local, setLocal] = useState<PostAttachment | null>(attachment);
  const [pendingConfirm, setPendingConfirm] = useState<{ id: string; kind: AttachmentKind } | null>(
    null
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-mode state — separate from remove-mode so a failed attach error
  // doesn't poison the remove flow's banner (and vice versa).
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  // After a successful attach we router.refresh() to pick up the new
  // attachment server-side (the action only returns the row id; the
  // Attached*Card data has more fields than we cheaply reconstruct
  // client-side). The parent re-renders with the new `attachment` prop;
  // this effect keeps `local` in sync so the read card swaps in.
  useEffect(() => {
    setLocal(attachment);
  }, [attachment]);

  const canAttach = !local && (attachPgnAction !== undefined || attachFenAction !== undefined);

  if (!local && !canAttach) return null;

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

  async function performAttach(mode: AggregatedAttachmentMode) {
    if (mode.kind === 'empty') {
      setIsAttachModalOpen(false);
      return;
    }

    setAttachError(null);
    setIsAttaching(true);

    const fd = new FormData();
    let action: AttachAction | undefined;

    if (mode.kind === 'pgn') {
      fd.set('attachment', mode.pgn);
      if (mode.anonymize) fd.set('attachmentAnonymize', 'on');
      action = attachPgnAction;
    } else if (mode.kind === 'fen') {
      if (!mode.valid) {
        setAttachError(tAdd('invalidFen'));
        setIsAttaching(false);
        return;
      }
      fd.set('attachmentFen', mode.fen);
      if (mode.caption !== null) fd.set('attachmentFenCaption', mode.caption);
      action = attachFenAction;
    }

    if (!action) {
      setAttachError(tAdd('error'));
      setIsAttaching(false);
      return;
    }

    const result = await action(postId, locale, fd);
    setIsAttaching(false);

    if ('error' in result) {
      // Try the page-local 'add' namespace first, then fall back to the
      // dotted error keys the create flow uses for PGN attachments
      // (`attachment.error.*`) and FEN attachments
      // (`postFenAttachment.error.*`).
      setAttachError(tAdd.has(result.error) ? tAdd(result.error) : tAdd('error'));
      return;
    }

    // Trigger a server re-render so the page picks up the new attachment
    // via getAttachmentsForPosts on the next render. The useEffect above
    // syncs `local` once the fresh `attachment` prop reaches us.
    setIsAttachModalOpen(false);
    router.refresh();
  }

  if (!local) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={() => setIsAttachModalOpen(true)}
          disabled={isAttaching}
          className="inline-flex items-center gap-1.5 text-xs text-link-primary hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          <FaPaperclip aria-hidden="true" className="h-3 w-3" />
          {tAdd('button')}
        </button>
        {attachError && <p className="mt-1 text-sm text-destructive">{attachError}</p>}
        {isAttachModalOpen && (
          <AttachmentModal
            isOpen={isAttachModalOpen}
            onClose={() => setIsAttachModalOpen(false)}
            onApply={(mode) => {
              void performAttach(mode);
            }}
          />
        )}
        {isAttaching && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Button type="button" variant="outline" size="sm" disabled loading>
              {tAdd('attaching')}
            </Button>
          </div>
        )}
      </div>
    );
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
