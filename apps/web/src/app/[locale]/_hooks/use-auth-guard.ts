'use client';

import { useCallback, useState } from 'react';

import { useAuth } from '../_contexts/AuthContext';

export function useAuthGuard() {
  const { user, isProvisional } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const guardAction = useCallback(
    (callback: () => void) => {
      // Only fully-registered members proceed. Anonymous *and* provisional
      // (signed in but no profile / username yet) viewers get the shared
      // AuthPromptModal, which shows the sign-in vs the finish-registration
      // variant itself based on the auth state — so a provisional user is
      // prompted to complete registration before, not after, composing.
      if (user && !isProvisional) {
        callback();
      } else {
        setIsModalOpen(true);
      }
    },
    [user, isProvisional]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return { guardAction, isModalOpen, closeModal };
}
