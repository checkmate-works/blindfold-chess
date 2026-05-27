'use client';

import { useRef, useState } from 'react';

import { useLocale, useTranslations } from 'next-intl';

import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import { Button, UnsavedChangesDialog } from '@/app/_components';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';
import { FaPlay } from 'react-icons/fa';
import { FiInfo } from 'react-icons/fi';

import type { ChunkOption } from '@/lib/chunks/types';
import type { ThemeOption } from '@/lib/themes/types';

import { useFenBoardEditor } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-fen-board-editor';
import { useTagSelection } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-tag-selection';
import { EMPTY_BOARD_FEN } from '@/app/[locale]/(public)/practice/(free-play)/_lib/board-editor-constants';
import { buildDefaultPracticeTitle } from '@/app/[locale]/(public)/practice/(free-play)/_lib/default-title';
import { SESSION_STORAGE_KEYS } from '@/app/[locale]/(public)/practice/_lib/session-storage-keys';

import { createPosition } from '../_actions/createPosition';
import { PositionFormFields } from './PositionFormFields';

/**
 * Seed payload when the form is opened via `?from=<id>` on the new page.
 * The author's display name is intentionally ignored when this is present:
 * forks copy the source's title verbatim (GitHub-style — repo name carries
 * over). `themeIds` / `chunkIds` are resolved against the loaded catalogs.
 */
export type PositionForkSeed = {
  sourceId: string;
  sourceTitle: string;
  fen: string;
  title: string;
  description: string;
  themeIds: string[];
  chunkIds: string[];
};

/** Stable key for an unordered list of tag options, for dirty comparison. */
function toSortedIdKey(items: ReadonlyArray<{ id: string }>): string {
  return items
    .map((item) => item.id)
    .sort()
    .join(',');
}

/**
 * Treat the empty-board FEN and a blank input as the same "no position yet"
 * baseline, so clearing the board on a fresh `/new` does not count as an edit.
 * Fork mode seeds a real FEN, so a change there is still detected.
 */
function normalizeFen(fen: string): string {
  const trimmed = fen.trim();
  return trimmed === EMPTY_BOARD_FEN ? '' : trimmed;
}

type Props = {
  displayName?: string;
  /**
   * Skip the unsaved-changes navigation guard. Used when the form is
   * rendered behind a guest sign-up overlay: the guest cannot submit, so
   * the guard would otherwise block the sign-up CTA click with a modal
   * that makes no sense in context.
   */
  disableUnsavedGuard?: boolean;
  availableThemes?: ThemeOption[];
  availableChunks?: ChunkOption[];
  /**
   * Fork-source data when the form is opened via `?from=<id>`. When
   * present, every field is seeded from the source row and the default
   * title generator is bypassed. `sourceId` rides through to
   * `createPosition` as `forkedFromId` and is re-validated server-side.
   */
  forkSeed?: PositionForkSeed;
};

export function CreatePositionForm({
  displayName,
  disableUnsavedGuard = false,
  availableThemes = [],
  availableChunks = [],
  forkSeed,
}: Props = {}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('practice.positionMemory.create');
  const tUnsaved = useTranslations('unsavedChanges');

  // Resolve fork seed tag IDs into option objects using the loaded catalog.
  // Computed once via useRef so option lookups don't repeat each render.
  const seededThemes = useRef<ThemeOption[]>(
    forkSeed
      ? forkSeed.themeIds
          .map((id) => availableThemes.find((t) => t.id === id))
          .filter((t): t is ThemeOption => t !== undefined)
      : []
  ).current;
  const seededChunks = useRef<ChunkOption[]>(
    forkSeed
      ? forkSeed.chunkIds
          .map((id) => availableChunks.find((c) => c.id === id))
          .filter((c): c is ChunkOption => c !== undefined)
      : []
  ).current;

  const board = useFenBoardEditor({ initialFen: forkSeed?.fen });
  const tags = useTagSelection({
    initialThemes: seededThemes,
    initialChunks: seededChunks,
  });

  // Baselines for the dirty-check, captured once on mount. The form starts
  // pre-populated — a default title is always present, and fork mode seeds
  // every field — so the guard must compare against these initial values
  // rather than against "empty". Without this, an untouched `/new` visit is
  // immediately `isDirty: true` (the auto-generated title is non-empty) and
  // the unsaved-changes guard prompts on the first navigation away.
  const defaultTitleRef = useRef(
    forkSeed ? forkSeed.title : buildDefaultPracticeTitle('Position', displayName)
  );
  const defaultDescriptionRef = useRef(forkSeed?.description ?? '');
  const initialThemeIdsRef = useRef(toSortedIdKey(seededThemes));
  const initialChunkIdsRef = useRef(toSortedIdKey(seededChunks));

  const [title, setTitle] = useState(defaultTitleRef.current);
  const [description, setDescription] = useState(defaultDescriptionRef.current);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isDirty =
    !submitted &&
    (title.trim() !== defaultTitleRef.current.trim() ||
      description.trim() !== defaultDescriptionRef.current.trim() ||
      normalizeFen(board.fenInput) !== normalizeFen(forkSeed?.fen ?? '') ||
      toSortedIdKey(tags.selectedThemes) !== initialThemeIdsRef.current ||
      toSortedIdKey(tags.selectedChunks) !== initialChunkIdsRef.current);

  const { isBlocking, confirm, cancel } = useUnsavedChanges({
    isDirty: disableUnsavedGuard ? false : isDirty,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    board.setPositionError(false);

    if (!board.trimmedFen || !board.isFenValid) {
      board.setPositionError(true);
      return;
    }

    setPending(true);

    try {
      const result = await createPosition({
        fen: board.trimmedFen,
        title,
        description: description || null,
        themeIds: tags.selectedThemes.map((th) => th.id),
        chunkIds: tags.selectedChunks.map((c) => c.id),
        ...(forkSeed ? { forkedFromId: forkSeed.sourceId } : {}),
      });

      if ('error' in result) {
        setError(result.error);
        return;
      }

      // Stash any belt-rank grants triggered by this submission so the
      // RankAchievementModal mounted on the destination page can pick them
      // up. Mirrors the challenge-completion flow.
      if (result.grantedRanks && result.grantedRanks.length > 0) {
        sessionStorage.setItem(
          SESSION_STORAGE_KEYS.GRANTED_RANKS,
          JSON.stringify(result.grantedRanks)
        );
      }

      // flushSync ensures the re-render (isDirty → false) completes
      // before router.push triggers the navigation guard check.
      flushSync(() => setSubmitted(true));
      // Point grant fired → route via /thanks so the user lands on the
      // award screen, then continues to the position detail (toast
      // suppressed because the /thanks page already celebrates the create).
      // No-grant flows keep the legacy in-place toast UX.
      if (result.pointGrant) {
        const returnUrl = `/${locale}/practice/position-memory/${result.id}`;
        router.push(
          `/thanks?pointEventId=${result.pointGrant.pointEventId}&returnUrl=${encodeURIComponent(returnUrl)}`
        );
      } else {
        router.push(`/practice/position-memory/${result.id}?toast=position_created`);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
            {error}
          </div>
        )}

        {forkSeed && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"
          >
            <FiInfo className="h-4 w-4 flex-shrink-0" aria-hidden />
            <span>{t('forkBanner', { sourceTitle: forkSeed.sourceTitle })}</span>
          </div>
        )}

        <PositionFormFields
          board={board}
          tags={tags}
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          pending={pending}
          availableThemes={availableThemes}
          availableChunks={availableChunks}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon={<FaPlay />}
          fullWidth
          disabled={pending || !board.isFenValid || title.trim() === ''}
        >
          {pending ? t('submitting') : t('submit')}
        </Button>
      </form>

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />
    </>
  );
}
