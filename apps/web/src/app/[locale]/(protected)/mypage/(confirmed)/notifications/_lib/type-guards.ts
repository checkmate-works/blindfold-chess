export type PostMetadata = { topicType: string; topicKey: string; postId: string };
export type ReplyMetadata = PostMetadata & { replyId: string };
export type AnnouncementMetadata = { slug: string; title: string };
export type PositionMetadata = { positionId: string };

export function isPositionMetadata(m: unknown): m is PositionMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return typeof r.positionId === 'string';
}

export function isPostMetadata(m: unknown): m is PostMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return (
    typeof r.topicType === 'string' &&
    typeof r.topicKey === 'string' &&
    typeof r.postId === 'string'
  );
}

export function isReplyMetadata(m: unknown): m is ReplyMetadata {
  return (
    isPostMetadata(m) &&
    'replyId' in m &&
    typeof (m as Record<string, unknown>).replyId === 'string'
  );
}

export function isAnnouncementMetadata(m: unknown): m is AnnouncementMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return typeof r.slug === 'string' && typeof r.title === 'string';
}

export type AchievementBadge = {
  slug: string;
  menuType: string;
  leaderboardKey: string;
  placement: number;
};

export type AchievementGrantedMetadata = {
  badges: AchievementBadge[];
  year: number;
  month: number;
};

export function isAchievementGrantedMetadata(m: unknown): m is AchievementGrantedMetadata {
  if (typeof m !== 'object' || m === null) return false;
  const r = m as Record<string, unknown>;
  return (
    Array.isArray(r.badges) &&
    r.badges.length > 0 &&
    typeof r.year === 'number' &&
    typeof r.month === 'number'
  );
}
