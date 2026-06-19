import type { ReactNode } from 'react';

import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { getAttachmentsForPosts } from '@/lib/games/get-attachments-for-posts';

import { attachPostFenFromForm } from '@/app/[locale]/(public)/topics/_actions/attachPostFen';
import { attachPostPgn } from '@/app/[locale]/(public)/topics/_actions/attachPostPgn';
import { deletePost } from '@/app/[locale]/(public)/topics/_actions/deletePost';
import { editPost } from '@/app/[locale]/(public)/topics/_actions/editPost';
import { removePostAttachment } from '@/app/[locale]/(public)/topics/_actions/removePostAttachment';
import { TopicPostDetailLayout } from '@/app/[locale]/(public)/topics/_components/TopicPostDetailLayout';
import {
  buildAttachmentNodeMap,
  renderAttachment,
} from '@/app/[locale]/(public)/topics/_components/render-attachment';
import { validateSort } from '@/app/[locale]/(public)/topics/_lib/pagination';
import { fetchPostDetailData } from '@/app/[locale]/(public)/topics/_lib/post-detail';
import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { ReplyAttachmentActions } from '../_components/ReplyForm';
import type { ToggleLikeAction } from './action-types';
import type { TopicPostWithAuthor } from './shared';

type BaseParams = { locale: Locale; postId: string };

type Props<P> = {
  params: Promise<P>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Topic-specific props assembled per page and handed to `TopicPostDetailLayout`. */
export type TopicPostDetailView = {
  pageTitle: string;
  sectionTitle: string;
  topicVisual: ReactNode;
  opMeta?: ReactNode;
  topicKey: string;
  redirectPath: string;
  i18n: { likeNamespace: string; replyNamespace: string; deleteNamespace: string };
  comments: { sectionTitle: string; sortBasePath: string; sortTranslationKey: string };
  breadcrumbItems: BreadcrumbItem[];
};

type CreateTopicPostDetailPageConfig<
  P extends BaseParams,
  TTopic,
  TPost extends TopicPostWithAuthor,
> = {
  /** Load the topic (opening / square / chunk). `null` → notFound / empty metadata. */
  loadTopic: (params: P) => Promise<TTopic | null>;
  /** Load the OP post for this topic. `null` → notFound / empty metadata. */
  loadPost: (params: P, topic: TTopic) => Promise<TPost | null>;
  /** Build raw metadata fields for the post detail page. */
  buildMetadata: (ctx: {
    locale: Locale;
    params: P;
    topic: TTopic;
    post: TPost;
  }) =>
    | Promise<{ title: string; description?: string; path: string }>
    | { title: string; description?: string; path: string };
  /** Base i18n namespace holding `replies.followRequired` (e.g. `topics.openings`). */
  topicNamespace: string;
  /** Assemble the topic-specific layout props. */
  buildView: (ctx: {
    locale: Locale;
    params: P;
    topic: TTopic;
    post: TPost;
    authorName: string;
  }) => Promise<TopicPostDetailView> | TopicPostDetailView;
  /** Route-local Server Actions (one `"use server"` file per route). */
  actions: {
    toggleLike: ToggleLikeAction;
    replyAttachmentActions: ReplyAttachmentActions;
  };
};

/**
 * Builds the `generateMetadata` + page export for a topic post detail page.
 *
 * The openings / squares / chunks detail pages share an identical body:
 * validate the topic, load the OP, fetch the comment thread + every
 * attachment in one round-trip, then render `TopicPostDetailLayout` with a
 * large block of shared Server Action props. Only the topic visual, i18n
 * namespaces, breadcrumbs, and route-local reply/like actions differ — those
 * are supplied via config.
 */
export function createTopicPostDetailPage<
  P extends BaseParams,
  TTopic,
  TPost extends TopicPostWithAuthor,
>(config: CreateTopicPostDetailPageConfig<P, TTopic, TPost>) {
  async function generateMetadata({ params }: Props<P>): Promise<Metadata> {
    const resolved = await params;

    const topic = await config.loadTopic(resolved);
    if (!topic) {
      return {};
    }

    const post = await config.loadPost(resolved, topic);
    if (!post) {
      return {};
    }

    const { title, description, path } = await config.buildMetadata({
      locale: resolved.locale,
      params: resolved,
      topic,
      post,
    });

    return {
      ...generateCanonicalMetadata({ locale: resolved.locale, path, title, description }),
      title: resolveTitle(title, resolved.locale),
      ...(description ? { description } : {}),
    };
  }

  async function Page({ params, searchParams }: Props<P>) {
    const resolved = await params;
    const { locale, postId } = resolved;
    const sortBy = validateSort(((await searchParams).sort as string | undefined) ?? 'new');

    const topic = await config.loadTopic(resolved);
    if (!topic) {
      notFound();
    }

    const post = await config.loadPost(resolved, topic);
    if (!post) {
      notFound();
    }

    const { user, rootWithMeta, replies, isAuthor, canReply } = await fetchPostDetailData(
      postId,
      post
    );

    // Fetch the OP's attachment AND every reply's in one round-trip. The OP's
    // render flows into the OP card via the `opAttachment` slot (after the
    // body, mirroring CommentNode's own attachment position); each reply's
    // flows into `extraContentByPostId` so CommentTree surfaces the matching
    // Attached* card under the reply that owns it.
    const replyIds = replies.map((r) => r.id);
    const allPostIds = [postId, ...replyIds];
    const attachments = await getAttachmentsForPosts(allPostIds);
    const opAttachmentRow = attachments.get(postId) ?? null;

    const tVideo = await getTranslations({ locale, namespace: 'postVideoAttachmentRender' });
    const fallbackVideoTitle = tVideo('fallbackTitle');
    const opAttachment = opAttachmentRow
      ? renderAttachment(opAttachmentRow, fallbackVideoTitle)
      : undefined;
    const replyExtraContentByPostId = buildAttachmentNodeMap(
      replyIds,
      attachments,
      fallbackVideoTitle
    );

    const rt = await getTranslations({ locale, namespace: config.topicNamespace });
    const replyRestrictionMessage =
      !isAuthor && post.replyPermission === 'followers' && !canReply
        ? rt('replies.followRequired')
        : null;

    const tCommon = await getTranslations({ locale, namespace: 'Common' });
    const authorName = post.author?.displayName || post.author?.username || tCommon('deletedUser');

    const view = await config.buildView({ locale, params: resolved, topic, post, authorName });

    return (
      <TopicPostDetailLayout
        locale={locale}
        pageTitle={view.pageTitle}
        sectionTitle={view.sectionTitle}
        topicVisual={view.topicVisual}
        opMeta={view.opMeta}
        opAttachment={opAttachment}
        rootWithMeta={rootWithMeta}
        replies={replies}
        user={user}
        topicKey={view.topicKey}
        canReply={canReply}
        replyRestrictionMessage={replyRestrictionMessage}
        toggleLikeAction={config.actions.toggleLike}
        deletePostAction={deletePost}
        editPostAction={editPost}
        removeAttachmentAction={removePostAttachment}
        attachPgnAction={attachPostPgn}
        attachFenAction={attachPostFenFromForm}
        attachmentsByPostId={attachments}
        attachmentFallbackVideoTitle={fallbackVideoTitle}
        replyAttachmentActions={config.actions.replyAttachmentActions}
        extraContentByPostId={replyExtraContentByPostId}
        redirectPath={view.redirectPath}
        i18n={view.i18n}
        comments={{
          sectionTitle: view.comments.sectionTitle,
          // Exclude soft-deleted replies: `getRepliesByPostId` includes them
          // (the tree keeps "[deleted]" tombstones with live descendants), but
          // they are not real comments and must not inflate the badge count.
          count: replies.filter((r) => !r.deletedAt).length,
          sortBy,
          sortBasePath: view.comments.sortBasePath,
          sortTranslationKey: view.comments.sortTranslationKey,
        }}
        breadcrumbItems={view.breadcrumbItems}
      />
    );
  }

  return { generateMetadata, Page };
}
