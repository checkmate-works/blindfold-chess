'use client';

import { useState, useTransition } from 'react';

import { useRouter } from '@/i18n/routing';
import { FiSlash } from 'react-icons/fi';

import { toggleBlock } from '../../_actions/toggleBlock';

type Props = {
  targetUsername: string;
  locale: string;
  initialBlocked: boolean;
  /** Pre-resolved (interpolated) copy — the server owns i18n formatting. */
  labels: {
    block: string;
    unblock: string;
    blockDescription: string;
    blockedState: string;
    error: string;
  };
};

export function BlockActions({ targetUsername, locale, initialBlocked, labels }: Props) {
  const [blocked, setBlocked] = useState(initialBlocked);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onToggle = () => {
    setFailed(false);
    startTransition(async () => {
      const result = await toggleBlock(targetUsername, locale);
      if ('error' in result) {
        setFailed(true);
        return;
      }
      setBlocked(result.blocked);
      // Re-fetch the profile so its Follow button / menu reflect the new state.
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-foreground">{blocked ? labels.blockedState : labels.blockDescription}</p>
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full border border-destructive px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
      >
        <FiSlash className="h-4 w-4" aria-hidden />
        {blocked ? labels.unblock : labels.block}
      </button>
      {failed && <p className="text-sm text-destructive">{labels.error}</p>}
    </div>
  );
}
