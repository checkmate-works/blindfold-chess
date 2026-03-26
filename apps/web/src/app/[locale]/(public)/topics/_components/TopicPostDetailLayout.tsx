import type { ReactNode } from 'react';

import type { User } from '@supabase/supabase-js';

import { Link } from '@/i18n/routing';

import { PagePanel, PageTitle, SectionTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { LikeMeta, PostWithReplyMeta, TopicPostWithAuthor } from '../_lib/queries';
import { PostDetailContent } from './PostDetailContent';

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type CreateReplyState = { error?: string };

type ToggleLikeAction = (
  postId: string,
  locale: string,
  topicKey: string
) => Promise<{ liked: boolean; likeCount: number } | { error: string }>;

type DeletePostAction = (
  postId: string,
  locale: string
) => Promise<{ success: true } | { error: string }>;

type CreateReplyAction = (
  locale: string,
  topicKey: string,
  postId: string,
  prevState: CreateReplyState,
  formData: FormData
) => Promise<CreateReplyState>;

type Props = {
  locale: Locale;
  pageTitle: string;
  sectionTitle: string;
  /** Topic-specific visual (board component) */
  topicVisual: ReactNode;
  /** Back link config */
  backLink: {
    href: string;
    label: string;
  };
  /** Post detail content props */
  post: TopicPostWithAuthor;
  user: User | null;
  topicKey: string;
  likeMeta: LikeMeta;
  replies: PostWithReplyMeta[];
  canReply: boolean;
  replyRestrictionMessage: string | null;
  toggleLikeAction: ToggleLikeAction;
  deletePostAction: DeletePostAction;
  createReplyAction: CreateReplyAction;
  redirectPath: string;
  likeI18nNamespace: string;
  deleteI18nNamespace: string;
  replyI18nNamespace: string;
  repliesTitle: string;
  repliesCount: string;
  noReplies: string;
  loginToReply: string;
  /** Extra content rendered inside PostDetailContent (e.g., rating display) */
  extraContent?: ReactNode;
  /** Breadcrumb items */
  breadcrumbItems: BreadcrumbItem[];
};

export function TopicPostDetailLayout({
  locale,
  pageTitle,
  sectionTitle,
  topicVisual,
  backLink,
  post,
  user,
  topicKey,
  likeMeta,
  replies,
  canReply,
  replyRestrictionMessage,
  toggleLikeAction,
  deletePostAction,
  createReplyAction,
  redirectPath,
  likeI18nNamespace,
  deleteI18nNamespace,
  replyI18nNamespace,
  repliesTitle,
  repliesCount,
  noReplies,
  loginToReply,
  extraContent,
  breadcrumbItems,
}: Props) {
  return (
    <div className="space-y-8">
      <PageTitle>{pageTitle}</PageTitle>

      <PagePanel>
        <SectionTitle>{sectionTitle}</SectionTitle>

        {topicVisual}

        <div>
          <Link
            href={backLink.href}
            locale={locale}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; {backLink.label}
          </Link>
        </div>

        <PostDetailContent
          post={post}
          user={user}
          locale={locale}
          topicKey={topicKey}
          likeMeta={likeMeta}
          replies={replies}
          canReply={canReply}
          replyRestrictionMessage={replyRestrictionMessage}
          toggleLikeAction={toggleLikeAction}
          deletePostAction={deletePostAction}
          createReplyAction={createReplyAction}
          redirectPath={redirectPath}
          likeI18nNamespace={likeI18nNamespace}
          deleteI18nNamespace={deleteI18nNamespace}
          replyI18nNamespace={replyI18nNamespace}
          repliesTitle={repliesTitle}
          repliesCount={repliesCount}
          noReplies={noReplies}
          loginToReply={loginToReply}
          extraContent={extraContent}
        />

        <Breadcrumb items={breadcrumbItems} locale={locale} />
      </PagePanel>
    </div>
  );
}
