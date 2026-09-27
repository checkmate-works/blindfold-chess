import { describe, expect, it } from 'vitest';

import { planReplyNotifications } from './reply-notifications';

const direct = { parentId: 'post', rootPostId: 'post' };
const nested = { parentId: 'reply', rootPostId: 'post' };

describe('planReplyNotifications', () => {
  it('notifies the post author of a direct reply as a comment on an authored topic', () => {
    expect(
      planReplyNotifications({
        topicType: 'opening',
        actorId: 'me',
        ...direct,
        notifyUserId: 'author',
        rootPostAuthorId: 'author',
      })
    ).toEqual([{ userId: 'author', type: 'new_comment_on_topic' }]);
  });

  it('keeps a direct reply as a person-to-person reply on other topic types', () => {
    expect(
      planReplyNotifications({
        topicType: 'chunk',
        actorId: 'me',
        ...direct,
        notifyUserId: 'author',
        rootPostAuthorId: 'author',
      })
    ).toEqual([{ userId: 'author', type: 'reply' }]);
  });

  it('notifies both the replied-to author and the thread owner of a nested reply', () => {
    expect(
      planReplyNotifications({
        topicType: 'square',
        actorId: 'me',
        ...nested,
        notifyUserId: 'replier',
        rootPostAuthorId: 'owner',
      })
    ).toEqual([
      { userId: 'replier', type: 'reply' },
      { userId: 'owner', type: 'new_comment_on_topic' },
    ]);
  });

  it('does not notify the thread owner twice when they wrote the replied-to reply', () => {
    expect(
      planReplyNotifications({
        topicType: 'chunk',
        actorId: 'me',
        ...nested,
        notifyUserId: 'owner',
        rootPostAuthorId: 'owner',
      })
    ).toEqual([{ userId: 'owner', type: 'reply' }]);
  });

  it('never notifies the actor', () => {
    expect(
      planReplyNotifications({
        topicType: 'opening',
        actorId: 'me',
        ...nested,
        notifyUserId: 'me',
        rootPostAuthorId: 'me',
      })
    ).toEqual([]);
  });

  it('passes an anonymised author through for createNotification to skip', () => {
    expect(
      planReplyNotifications({
        topicType: 'chunk',
        actorId: 'me',
        ...nested,
        notifyUserId: null,
        rootPostAuthorId: 'owner',
      })
    ).toEqual([
      { userId: null, type: 'reply' },
      { userId: 'owner', type: 'reply' },
    ]);
  });
});
