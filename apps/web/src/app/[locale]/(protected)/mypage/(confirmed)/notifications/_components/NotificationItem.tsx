'use client';

import { useTransition } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { NotificationWithActor } from '../_actions';
import { markAsRead } from '../_actions';

type Props = {
  notification: NotificationWithActor;
};

export function NotificationItem({ notification }: Props) {
  const locale = useLocale();
  const t = useTranslations('MypageNotifications');
  const router = useRouter();
  const [, startTransition] = useTransition();

  const actor = notification.actor;
  const actorName = actor?.displayName ?? actor?.username ?? '';

  function getMessage(): string {
    switch (notification.type) {
      case 'follow':
        return t('followMessage', { actor: actorName });
      case 'like':
        return t('likeMessage', { actor: actorName });
      default:
        return t('unknownNotification');
    }
  }

  function getLink(): string | null {
    if (notification.type === 'follow' && actor) {
      return `/${locale}/@/${actor.username}`;
    }
    if (notification.type === 'like' && notification.metadata) {
      const meta = notification.metadata as {
        topicType?: string;
        topicKey?: string;
        postId?: string;
      };
      if (meta.topicType && meta.topicKey && meta.postId) {
        return `/${locale}/topics/${meta.topicType}s/${meta.topicKey}/posts/${meta.postId}`;
      }
    }
    return null;
  }

  function handleClick() {
    if (notification.read) return;
    startTransition(async () => {
      await markAsRead(notification.id);
      router.refresh();
    });
  }

  const link = getLink();
  const message = getMessage();
  const timeAgo = notification.createdAt.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const content = (
    <div
      className={`flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 ${
        !notification.read ? 'bg-accent/30' : ''
      }`}
    >
      {actor?.avatarUrl ? (
        <Image
          src={actor.avatarUrl}
          alt={actorName}
          width={40}
          height={40}
          className="rounded-full object-cover h-10 w-10 flex-shrink-0"
          unoptimized
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0">
          <span className="text-sm font-medium">
            {actorName ? actorName.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
      {!notification.read && (
        <div className="flex-shrink-0 mt-1">
          <div className="h-2 w-2 rounded-full bg-link-primary" />
        </div>
      )}
    </div>
  );

  if (link) {
    return (
      <Link href={link} onClick={handleClick} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className="w-full text-left" onClick={handleClick}>
      {content}
    </button>
  );
}
