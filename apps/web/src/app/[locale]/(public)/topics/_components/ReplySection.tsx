'use client';

import { useCallback, useRef, useState } from 'react';

import type { PostWithReplyMeta } from '../_lib/queries';
import { ReplyForm } from './ReplyForm';
import { ReplyList } from './ReplyList';

type CreateReplyState = { error?: string };

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type CreateReplyAction = (
  locale: string,
  topicKey: string,
  postId: string,
  prevState: CreateReplyState,
  formData: FormData
) => Promise<CreateReplyState>;

type ReplyTarget = {
  replyToId: string;
  replyToUsername: string;
};

type Props = {
  replies: PostWithReplyMeta[];
  locale: string;
  topicKey: string;
  postId: string;
  toggleLikeAction: ToggleLikeAction;
  createReplyAction: CreateReplyAction;
  likeI18nNamespace: string;
  replyI18nNamespace: string;
  showForm: boolean;
};

export function ReplySection({
  replies,
  locale,
  topicKey,
  postId,
  toggleLikeAction,
  createReplyAction,
  likeI18nNamespace,
  replyI18nNamespace,
  showForm,
}: Props) {
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleReplyClick = useCallback((replyId: string, username: string) => {
    setReplyTarget({ replyToId: replyId, replyToUsername: username });
    // Scroll to form after state update
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
  }, []);

  return (
    <>
      {replies.length > 0 && (
        <ReplyList
          replies={replies}
          locale={locale}
          topicKey={topicKey}
          toggleLikeAction={toggleLikeAction}
          likeI18nNamespace={likeI18nNamespace}
          replyI18nNamespace={replyI18nNamespace}
          onReplyClick={showForm ? handleReplyClick : undefined}
        />
      )}
      {showForm && (
        <div ref={formRef}>
          <ReplyForm
            locale={locale}
            topicKey={topicKey}
            postId={postId}
            createReplyAction={createReplyAction}
            i18nNamespace={replyI18nNamespace}
            replyToId={replyTarget?.replyToId}
            replyToUsername={replyTarget?.replyToUsername}
            onCancelReply={handleCancelReply}
          />
        </div>
      )}
    </>
  );
}
