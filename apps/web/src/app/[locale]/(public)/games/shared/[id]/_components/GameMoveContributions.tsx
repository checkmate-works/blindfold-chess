'use client';

import { useState } from 'react';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiPlus } from 'react-icons/fi';

import type { ChunkOption } from '@/lib/chunks/types';
import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';

import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import { TEXT_LINK_MUTED_CLASSES } from '@/app/[locale]/_lib/link-classes';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useGameChunkLinks } from '../_hooks/use-game-chunk-links';
import { useGameCommentThread } from '../_hooks/use-game-comment-thread';
import { groupReplies } from '../_lib/game-comment-tree';
import { GameChunkCard } from './GameChunkCard';
import { GameChunkPicker } from './GameChunkPicker';
import { type CommentUser, GameCommentProvider } from './GameCommentContext';
import { GameCommentForm } from './GameCommentForm';
import { GameCommentNode } from './GameCommentNode';

type Props = {
  gameId: string;
  /** Move both threads anchor to (0-based ply). */
  currentPly: number;
  /** FEN currently on the board — seeds "create a chunk from this position". */
  currentFen: string;
  /** All comments for the game (every ply); filtered to `currentPly` inside. */
  comments: GameCommentItem[];
  /** All chunk links for the game (every ply); filtered to `currentPly` inside. */
  gameChunks: GameChunkItem[];
  /** Published chunks selectable in the picker. */
  availableChunks: ChunkOption[];
  /** The signed-in viewer, or null. */
  currentUser: CommentUser | null;
  /** Whether the viewer is the game's registered owner (may remove any link). */
  isGameOwner: boolean;
  locale: Locale;
};

type Composer = 'comments' | 'chunks';

/**
 * Per-move contributions for the position on the board: the advice comments
 * and the applicable-chunk links, shown one after another (both always
 * visible). Only the *input* is multiplexed — a single toggle picks whether
 * the composer at the bottom posts a comment or links a chunk. (Previously the
 * posted content itself was tabbed, which hid one axis behind the other.)
 */
export function GameMoveContributions({
  gameId,
  currentPly,
  currentFen,
  comments,
  gameChunks,
  availableChunks,
  currentUser,
  isGameOwner,
  locale,
}: Props) {
  const t = useTranslations('sharedGames');
  const currentUserId = currentUser?.id;

  const thread = useGameCommentThread({ gameId, currentPly, comments, currentUser });
  const links = useGameChunkLinks({
    gameId,
    currentPly,
    chunks: gameChunks,
    currentUserId,
    isGameOwner,
  });

  const [composer, setComposer] = useState<Composer>('comments');

  return (
    <div className="space-y-5">
      {/* Posted advice comments for this move. */}
      {thread.roots.length > 0 && (
        <GameCommentProvider
          value={{
            locale,
            currentUserId,
            reply: thread.reply,
            edit: thread.edit,
            remove: thread.remove,
          }}
        >
          <div className="space-y-6">
            {thread.roots.map((root) => (
              <GameCommentNode key={root.id} node={root} replyGroups={groupReplies(root)} />
            ))}
          </div>
        </GameCommentProvider>
      )}

      {/* Chunk links applicable to this move. */}
      {links.forPly.length > 0 && (
        <ul className="space-y-2">
          {links.forPly.map((c) => (
            <GameChunkCard
              key={c.id}
              slug={c.slug}
              title={c.title}
              description={c.description}
              representativeFen={c.representativeFen}
              badge={t('chunks.badge')}
              locale={locale}
              onRemove={links.canRemove(c) ? () => links.handleRemoveSaved(c.id) : undefined}
              removeLabel={t('chunks.remove', { title: c.title })}
            />
          ))}
        </ul>
      )}

      {/* The single composer: a toggle selects what to post, then the matching
          form renders below it. The posted lists above are unaffected. */}
      <div className="space-y-3 border-t border-border pt-4">
        <div
          role="group"
          aria-label={t('contribute.add')}
          className="flex rounded-lg bg-secondary p-1"
        >
          {(['comments', 'chunks'] as const).map((kind) => {
            const isActive = composer === kind;
            const label =
              kind === 'comments' ? `💬 ${t('comments.title')}` : `🧠 ${t('chunks.badge')}`;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={isActive}
                onClick={() => setComposer(kind)}
                className={`flex-1 truncate rounded-md px-2 py-2 text-center text-sm font-medium transition-colors md:px-4 ${
                  isActive
                    ? 'bg-card text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {composer === 'comments' ? (
          <JoinConversationToggle
            count={thread.commentCount}
            joinLabel={t('comments.joinConversation')}
          >
            <GameCommentForm
              placeholder={t('comments.placeholder')}
              submitLabel={t('comments.submit')}
              submittingLabel={t('comments.submitting')}
              autoFocus
              resetOnSuccess
              onSubmit={(body) => thread.postComment(null, body)}
            />
          </JoinConversationToggle>
        ) : currentUserId !== undefined ? (
          <div className="space-y-3">
            <GameChunkPicker
              availableChunks={availableChunks}
              linkedChunkIds={links.excludedChunkIds}
              disabled={links.submitting}
              onSelect={links.stage}
              labels={{
                placeholder: t('chunks.placeholder'),
                noResults: t('chunks.noResults'),
                moreItemsHint: (count: number) => t('chunks.moreItemsHint', { count }),
              }}
            />

            {/* No matching chunk? Seed a new one from the current board position
                (the author pares it down to a pattern on the create form). */}
            <Link
              href={`/${locale}/chunks/new?fen=${encodeURIComponent(currentFen)}`}
              className="block"
            >
              <Button asChild variant="outline" fullWidth icon={<FiPlus />}>
                {t('chunks.createFromPosition')}
              </Button>
            </Link>

            {links.staged.length > 0 && (
              <>
                <ul className="space-y-2">
                  {links.staged.map((c) => (
                    <GameChunkCard
                      key={c.id}
                      slug={c.slug}
                      title={c.label}
                      description={c.description}
                      representativeFen={c.representativeFen}
                      badge={t('chunks.badge')}
                      locale={locale}
                      onRemove={() => links.unstage(c.id)}
                      removeLabel={t('chunks.remove', { title: c.label })}
                    />
                  ))}
                </ul>
                {links.error && <p className="text-sm text-destructive">{links.error}</p>}
                <Button
                  variant="primary"
                  fullWidth
                  onClick={links.handleSubmit}
                  disabled={links.submitting}
                  loading={links.submitting}
                >
                  {links.submitting
                    ? t('chunks.submitting')
                    : t('chunks.submit', { count: links.staged.length })}
                </Button>
              </>
            )}
            {links.staged.length === 0 && links.error && (
              <p className="text-sm text-destructive">{links.error}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('chunks.signInToLink')}{' '}
            <Link href={`/${locale}/sign-in`} className={TEXT_LINK_MUTED_CLASSES}>
              {t('chunks.signIn')}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
