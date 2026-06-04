import { getTranslations } from 'next-intl/server';

import { createTopicPostDetailPage } from '@/app/[locale]/(public)/topics/_lib/create-topic-post-detail-page';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getPostById } from '../../../_lib/queries';
import { isValidSquare } from '../../../_lib/squares';
import { SquareHighlightBoard } from '../../_components';
import { createReplyWithAttachment } from './_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from './_actions/createReplyWithFenAttachment';
import { toggleLike } from './_actions/toggleLike';

type Params = { locale: Locale; square: string; postId: string };

const { generateMetadata, Page } = createTopicPostDetailPage<
  Params,
  string,
  NonNullable<Awaited<ReturnType<typeof getPostById>>>
>({
  topicNamespace: 'topics.squares',
  loadTopic: async ({ square }) => (isValidSquare(square) ? square : null),
  loadPost: ({ postId }, square) => getPostById(postId, square),
  buildMetadata: async ({ locale, params: { square, postId } }) => {
    const t = await getTranslations({ locale, namespace: 'metadata.topicsSquarePost' });

    return {
      title: t('title', { square }),
      description: t('description', { square }),
      path: `topics/squares/${square}/posts/${postId}`,
    };
  },
  buildView: async ({ locale, params: { square, postId }, authorName }) => {
    const t = await getTranslations({ locale, namespace: 'topics' });
    const st = await getTranslations({ locale, namespace: 'topics.squares' });

    return {
      pageTitle: t('squares.pageTitle'),
      sectionTitle: t('squares.postDetail.authorView', { author: authorName, square }),
      topicVisual: <SquareHighlightBoard square={square} locale={locale} />,
      topicKey: square,
      redirectPath: `/${locale}/topics/squares/${square}`,
      i18n: {
        likeNamespace: 'topics.squares',
        deleteNamespace: 'topics.squares.deletePost',
        replyNamespace: 'topics.squares.replies',
      },
      comments: {
        sectionTitle: st('replies.title'),
        sortBasePath: `/topics/squares/${square}/posts/${postId}`,
        sortTranslationKey: 'topics.squares.sort',
      },
      breadcrumbItems: [
        { label: t('title'), href: '/topics' },
        { label: t('squares.title'), href: '/topics/squares' },
        { label: square, href: `/topics/squares/${square}` },
        { label: t('squares.readMore') },
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
