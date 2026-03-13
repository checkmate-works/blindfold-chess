'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { toggleAdsEnabled } from '../_actions/toggleAdsEnabled';

type AdsToggleProps = {
  enabled: boolean;
  labels: {
    enabled: string;
    disabled: string;
  };
};

export function AdsToggle({ enabled, labels }: AdsToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleAdsEnabled();
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        enabled
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-red-100 text-red-800 hover:bg-red-200'
      } disabled:opacity-50`}
    >
      {enabled ? labels.enabled : labels.disabled}
    </button>
  );
}
