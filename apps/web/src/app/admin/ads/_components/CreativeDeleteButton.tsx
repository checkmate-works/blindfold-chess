'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { deleteAdCreative } from '../_actions/deleteAdCreative';

type Props = {
  id: string;
  labels: { delete: string; deleting: string; confirm: string };
};

export function CreativeDeleteButton({ id, labels }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!window.confirm(labels.confirm)) return;
    startTransition(async () => {
      await deleteAdCreative(id);
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="px-3 py-1 text-xs font-medium rounded bg-destructive-soft text-destructive-soft-foreground hover:opacity-80 transition-opacity disabled:opacity-50"
    >
      {isPending ? labels.deleting : labels.delete}
    </button>
  );
}
