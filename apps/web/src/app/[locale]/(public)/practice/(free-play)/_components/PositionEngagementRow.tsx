import { POSITION_KIND_CONFIG, type PositionKind } from '@/lib/positions/kind';

import { LikeButton } from '@/app/[locale]/(public)/topics/_components/LikeButton';
import type { Locale } from '@/app/[locale]/_lib/types';

import { toggleLike } from '../_actions/toggleLike';
import type { PositionDetailData } from '../_lib/load-position-detail';
import { PositionEditRequestSummaryLink } from './edit-request/PositionEditRequestLinks';

type Props = {
  positionId: string;
  kind: PositionKind;
  locale: Locale;
  likeMeta: PositionDetailData['likeMeta'];
};

/**
 * The small metadata strip under a position detail page: the like toggle and
 * the edit-request summary link. Identical on the position-memory and puzzle
 * pages apart from which message namespace names the like counts, which the
 * kind already determines.
 */
export function PositionEngagementRow({ positionId, kind, locale, likeMeta }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      <LikeButton
        postId={positionId}
        locale={locale}
        topicKey=""
        initialLikeCount={likeMeta.likeCount}
        initialLikedByMe={likeMeta.likedByMe}
        toggleLikeAction={toggleLike}
        i18nNamespace={POSITION_KIND_CONFIG[kind].namespace}
      />
      <PositionEditRequestSummaryLink positionId={positionId} positionType={kind} locale={locale} />
    </div>
  );
}
