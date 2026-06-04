import { getTranslations } from 'next-intl/server';

import { getChunkBySlug } from '@/lib/chunks/queries';
import { ThemedBoardThumbnail } from '@/lib/positions/ui/ThemedBoardThumbnail';

import { createTopicPostDetailPage } from '@/app/[locale]/(public)/topics/_lib/create-topic-post-detail-page';
import { getPostByIdAndTopicKey } from '@/app/[locale]/(public)/topics/_lib/queries';
import type { Locale } from '@/app/[locale]/_lib/types';

import { createReplyWithAttachment } from './_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from './_actions/createReplyWithFenAttachment';
import { toggleLike } from './_actions/toggleLike';

type Params = { locale: Locale; slug: string; postId: string };

const { generateMetadata, Page } = createTopicPostDetailPage<
  Params,
  NonNullable<Awaited<ReturnType<typeof getChunkBySlug>>>,
  NonNullable<Awaited<ReturnType<typeof getPostByIdAndTopicKey>>>
>({
  topicNamespace: 'topics.chunks',
  loadTopic: ({ slug }) => getChunkBySlug(slug),
  loadPost: ({ postId, slug }) => getPostByIdAndTopicKey(postId, 'chunk', slug),
  buildMetadata: ({ params: { slug, postId }, topic: chunk }) => ({
    title: chunk.title,
    ...(chunk.description ? { description: chunk.description } : {}),
    path: `chunks/${slug}/posts/${postId}`,
  }),
  buildView: async ({ locale, params: { slug, postId }, topic: chunk, authorName }) => {
    const ct = await getTranslations({ locale, namespace: 'topics.chunks' });

    return {
      pageTitle: ct('detail.pageTitle'),
      sectionTitle: ct('postDetail.authorView', { author: authorName, name: chunk.title }),
      topicVisual: (
        <div className="max-w-xs mx-auto">
          <ThemedBoardThumbnail fen={chunk.representativeFen} className="w-full" />
        </div>
      ),
      topicKey: slug,
      redirectPath: `/${locale}/chunks/${slug}`,
      i18n: {
        likeNamespace: 'topics.chunks',
        deleteNamespace: 'topics.chunks.deletePost',
        replyNamespace: 'topics.chunks.replies',
      },
      comments: {
        sectionTitle: ct('replies.title'),
        sortBasePath: `/chunks/${slug}/posts/${postId}`,
        sortTranslationKey: 'topics.chunks.sort',
      },
      breadcrumbItems: [
        { label: 'Chunks', href: '/chunks' },
        { label: chunk.title, href: `/chunks/${slug}` },
        { label: ct('readMore') },
      ],
    };
  },
  actions: {
    toggleLike,
    replyAttachmentActions: {
      pgn: createReplyWithAttachment,
      fen: createReplyWithFenAttachment,
    },
  },
});

export { generateMetadata };
export default Page;
