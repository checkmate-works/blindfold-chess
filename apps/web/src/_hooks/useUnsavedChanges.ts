'use client';

import { useNavigationGuard } from 'next-navigation-guard';

type UseUnsavedChangesOptions = {
  isDirty: boolean;
};

type UseUnsavedChangesReturn = {
  isBlocking: boolean;
  confirm: () => void;
  cancel: () => void;
};

export function useUnsavedChanges({ isDirty }: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const guard = useNavigationGuard({ enabled: isDirty });

  return {
    isBlocking: guard.active,
    confirm: guard.accept,
    cancel: guard.reject,
  };
}
