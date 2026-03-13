'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

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
      className="text-sm text-link-primary hover:underline disabled:opacity-50"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await markAllAsRead();
          router.refresh();
        });
      }}
    >
      {label}
    </button>
  );
}
