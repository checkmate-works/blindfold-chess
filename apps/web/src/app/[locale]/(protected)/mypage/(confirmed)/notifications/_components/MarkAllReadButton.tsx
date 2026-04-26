'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { notifyNotificationsRead } from '@/config';

import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

import { markAllAsRead } from '../_actions';

type Props = {
  label: string;
};

export function MarkAllReadButton({ label }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={`text-sm disabled:opacity-50 ${TEXT_LINK_CLASSES}`}
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await markAllAsRead();
          notifyNotificationsRead();
          router.refresh();
        });
      }}
    >
      {label}
    </button>
  );
}
