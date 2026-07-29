'use client';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';
import { FaBrain } from 'react-icons/fa';

import type { ChunkOption } from '@/lib/chunks/types';
import type { GameChunkItem } from '@/lib/db/game-chunks';
import type { GameCommentItem } from '@/lib/db/game-comments';

import { JoinConversationToggle } from '@/app/[locale]/(public)/topics/_components/JoinConversationToggle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useGameChunkLinks } from '../_hooks/use-game-chunk-links';
import { useGameCommentThread } from '../_hooks/use-game-comment-thread';
import { groupReplies } from '../_lib/game-comment-tree';
import { groupChunkLinksBySuggester } from '../_lib/group-chunk-links';
import { GameChunkCard } from './GameChunkCard';
import { GameChunkLinkCard } from './GameChunkLinkCard';
import { GameChunkPicker } from './GameChunkPicker';
import { type CommentUser, GameCommentProvider } from './GameCommentContext';
import { GameCommentForm } from './GameCommentForm';
import { GameCommentNode } from './GameCommentNode';

type Props = {
  gameId: string;
  /**
   * Move both threads anchor to (0-based ply), or null for the whole-game
   * thread shown on the opening board. Chunk links are per-move only
   * (`game_chunks.ply` is NOT NULL), so the chunk picker/list render only for
   * a numbered ply.
   */
  currentPly: number | null;
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
  /** The game's own data, passed through to `GameCommentBody` via context. */
  moves: string[];
  startingFen: string | null;
  playerColor: Side;
};

/**
 * Contributions for the position on the board: the advice comments and the
 * applicable-chunk links, shown one after another (both always visible).
 * Below them sit two collapsed CTAs — "join the conversation" and "suggest a
 * chunk" — each expanding its own composer on demand. (Previously the posted
 * content itself was tabbed, which hid one axis behind the other.)
 *
 * Serves both anchors: a move position (`currentPly = N`) and the whole-game
 * thread on the opening board (`currentPly = null`), where the composer copy
 * targets the game rather than a move and the chunk affordances are absent
 * (chunks are assertions about a specific move's position).
 */
export function GameMoveContributions({
  gameId,
  currentPly,
  comments,
  gameChunks,
  availableChunks,
  currentUser,
  isGameOwner,
  locale,
  moves,
  startingFen,
  playerColor,
}: Props) {
  const t = useTranslations('sharedGames');
  const currentUserId = currentUser?.id;

  const thread = useGameCommentThread({ gameId, currentPly, comments, currentUser });
  const links = useGameChunkLinks({
    gameId,
    currentPly,
    chunks: gameChunks,
    currentUser,
    isGameOwner,
  });

  return (
    <div className="space-y-5">
      {/* Compose CTAs sit directly under the move heading (matching the topics /
          chunk detail pages) so they're reachable without scrolling past the
          posted content. Two collapsed buttons (same chrome as the topics
          "join the conversation" CTA): one opens the comment composer, the
          other the chunk picker. Anonymous clicks are routed to the sign-up
          modal by each toggle's own auth guard. */}
      <div className="space-y-3">
        <JoinConversationToggle
          count={thread.commentCount}
          joinLabel={t('comments.joinConversation')}
        >
          {/* Collapse back to the trigger once the comment is posted: it now
              sits in the thread below, and an empty textarea left open pushes
              that thread off a phone screen. Matches the inline reply form. */}
          {({ close }) => (
            <GameCommentForm
              placeholder={
                currentPly === null ? t('comments.placeholderGame') : t('comments.placeholder')
              }
              submitLabel={t('comments.submit')}
              submittingLabel={t('comments.submitting')}
              autoFocus
              onSubmit={async (body) => {
                const result = await thread.postComment(null, body);
                if (!result.error) close();
                return result;
              }}
            />
          )}
        </JoinConversationToggle>

        {currentPly !== null && (
          <JoinConversationToggle
            count={links.forPly.length}
            joinLabel={t('chunks.suggest')}
            icon={<FaBrain aria-hidden="true" className="text-muted-foreground" />}
          >
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
          </JoinConversationToggle>
        )}
      </div>

      {/* Posted advice comments for this move. */}
      {thread.roots.length > 0 && (
        <GameCommentProvider
          value={{
            locale,
            currentUserId,
            reply: thread.reply,
            edit: thread.edit,
            remove: thread.remove,
            moves,
            startingFen,
            playerColor,
          }}
        >
          <div className="space-y-6">
            {thread.roots.map((root) => (
              <GameCommentNode key={root.id} node={root} replyGroups={groupReplies(root)} />
            ))}
          </div>
        </GameCommentProvider>
      )}

      {/* Chunk links applicable to this move — rendered in the comment-card
          idiom so they read on the same axis as the advice thread. Consecutive
          links by the same suggester collapse into one card. */}
      {links.forPly.length > 0 && (
        <ul className="space-y-6">
          {groupChunkLinksBySuggester(links.forPly).map((group) => (
            <GameChunkLinkCard
              key={group[0].id}
              items={group}
              badge={t('chunks.badge')}
              locale={locale}
              canRemove={links.canRemove}
              onRemove={(item) => links.handleRemoveSaved(item.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
