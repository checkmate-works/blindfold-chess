import { getTranslations } from 'next-intl/server';

import { createTopicPostDetailPage } from '@/app/[locale]/(public)/topics/_lib/create-topic-post-detail-page';
import type { Locale } from '@/app/[locale]/_lib/types';

import { OpeningBoardWithMoves } from '../../../_components/OpeningBoardWithMoves';
import { getOpeningDisplayName } from '../../../_lib/get-opening-display-name';
import { getOpeningBySlug, getOpeningPostById } from '../../../_lib/queries';
import { RatingDisplay } from '../../_components';
import { createReplyForImageAttach } from './_actions/createReplyForImageAttach';
import { createReplyWithAttachment } from './_actions/createReplyWithAttachment';
import { createReplyWithFenAttachment } from './_actions/createReplyWithFenAttachment';
import { toggleLike } from './_actions/toggleLike';

type Params = { locale: Locale; slug: string; postId: string };

const { generateMetadata, Page } = createTopicPostDetailPage<
  Params,
  NonNullable<Awaited<ReturnType<typeof getOpeningBySlug>>>,
  NonNullable<Awaited<ReturnType<typeof getOpeningPostById>>>
>({
  topicNamespace: 'topics.openings',
  loadTopic: ({ slug }) => getOpeningBySlug(slug),
  loadPost: ({ postId, slug }) => getOpeningPostById(postId, slug),
  buildMetadata: async ({ locale, params: { slug, postId }, topic: opening }) => {
    const t = await getTranslations({ locale, namespace: 'metadata.topicsOpeningPost' });
    const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
    const displayName = getOpeningDisplayName(nameT, slug, opening.name);

    return {
      title: t('title', { name: displayName }),
      description: t('description', { name: displayName }),
      path: `topics/openings/${slug}/posts/${postId}`,
    };
  },
  buildView: async ({ locale, params: { slug, postId }, topic: opening, post, authorName }) => {
    const t = await getTranslations({ locale, namespace: 'topics' });
    const dt = await getTranslations({ locale, namespace: 'topics.openings' });
    const nameT = await getTranslations({ locale, namespace: 'topics.openings.names' });
    const displayName = getOpeningDisplayName(nameT, slug, opening.name);

    return {
      pageTitle: dt('detail.pageTitle'),
      sectionTitle: dt('postDetail.authorView', { author: authorName, name: displayName }),
      topicVisual: <OpeningBoardWithMoves fen={opening.fen} pgn={opening.pgn} />,
      opMeta: post.rating ? (
        <RatingDisplay
          preferenceRating={post.rating.preferenceRating}
          proficiencyRating={post.rating.proficiencyRating}
        />
      ) : undefined,
      topicKey: slug,
      redirectPath: `/${locale}/topics/openings/${slug}`,
      i18n: {
        likeNamespace: 'topics.openings.postDetail',
        deleteNamespace: 'topics.openings.deletePost',
        replyNamespace: 'topics.openings.replies',
      },
      comments: {
        sectionTitle: dt('replies.title'),
        sortBasePath: `/topics/openings/${slug}/posts/${postId}`,
        sortTranslationKey: 'topics.openings.sort',
      },
      breadcrumbItems: [
        { label: t('title'), href: '/topics' },
        { label: t('openings.title'), href: '/topics/openings' },
        { label: displayName, href: `/topics/openings/${slug}` },
        { label: t('openings.readMore') },
      ],
    };
  },
  actions: {
    toggleLike,
    replyAttachmentActions: {
      pgn: createReplyWithAttachment,
      fen: createReplyWithFenAttachment,
      image: createReplyForImageAttach,
    },
  },
});

export { generateMetadata };
export default Page;
