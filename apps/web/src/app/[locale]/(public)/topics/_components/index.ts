export { AttachedEmbedCard } from './AttachedEmbedCard';
export { AttachedGameCard } from './AttachedGameCard';
// AttachmentInput has no consumers in apps/web while the chunks new-post entry point
// is hidden from end users. Re-export is preserved so re-enabling is a one-line revert.
export { AttachmentInput } from './AttachmentInput';
export { BaseTopicPostCard } from './BaseTopicPostCard';
// TopicPostDetailLayout imports AdSenseGuard (server-only). Excluded from
// barrel to prevent server-only modules leaking into client bundles.
// Import directly: import { TopicPostDetailLayout } from './TopicPostDetailLayout';
