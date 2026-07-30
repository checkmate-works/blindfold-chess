'use client';

import { useTranslations } from 'next-intl';

import { FiAlertTriangle } from 'react-icons/fi';

export type ChunkReferenceCounts = {
  /** Live positions tagging this chunk via `position_chunks`. */
  positions: number;
  /** Live game moves linked to it via `game_chunks`. */
  games: number;
};

/** The fields whose change alters what an existing reference asserts. */
export type ChangedIdentityField = 'title' | 'slug' | 'fen';

type Props = {
  references: ChunkReferenceCounts;
  /** Identity fields currently differing from the saved row. */
  changed: readonly ChangedIdentityField[];
};

/**
 * Warns the owner that other people's positions and games already point at
 * this chunk, shown once an edit actually changes what those references
 * assert.
 *
 * @design why a warning and not a lock
 * A pre-publish chunk is editable precisely because its name is still being
 * worked out — that is the whole point of the state, and of the edit-request
 * workflow attached to it. Locking a chunk the moment someone links it would
 * turn "one person linked this early" into a permanent freeze, and would put
 * the veto in the hands of whoever moved first. So the owner keeps the
 * decision; they just stop making it blind.
 *
 * @design why it is reactive rather than always-on
 * A banner shown on every edit is noise for the common case (fixing a typo in
 * the description), and noise is what gets banners ignored. It appears only
 * when the title, slug, or board differ from the saved row — the three fields
 * a reference's meaning actually rests on. Description and annotations are
 * excluded: they elaborate the pattern rather than identify it, so changing
 * them cannot invalidate someone's "this position exhibits X".
 *
 * @design what it does NOT do
 * The people who made those assertions are not notified. Their links survive
 * a rename untouched — `position_chunks` and `game_chunks` key on `chunk_id`,
 * and the discussion thread's `topic_posts.topic_key` is rewritten in the
 * same transaction — so nothing breaks structurally; what changes is what the
 * link means. Deciding whether that warrants telling every linker is a
 * separate question from telling the person about to make the change, and
 * a notification per rename would be noisy out of proportion to the risk.
 */
export function ChunkReferenceWarning({ references, changed }: Props) {
  const t = useTranslations('chunks.form.referenceWarning');
  const total = references.positions + references.games;

  if (total === 0 || changed.length === 0) return null;

  // Both counts are rendered only when both are non-zero, so the sentence
  // never reads "0 games".
  const scope =
    references.positions > 0 && references.games > 0
      ? t('scopeBoth', { positions: references.positions, games: references.games })
      : references.positions > 0
        ? t('scopePositions', { count: references.positions })
        : t('scopeGames', { count: references.games });

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <FiAlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
      <div className="space-y-1">
        <p>
          {t('body', { scope, fields: changed.map((f) => t(`fields.${f}`)).join(t('separator')) })}
        </p>
        <p className="text-xs opacity-90">{t('hint')}</p>
      </div>
    </div>
  );
}
