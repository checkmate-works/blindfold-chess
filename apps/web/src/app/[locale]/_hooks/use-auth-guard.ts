'use client';

import { useCallback, useState } from 'react';

import { useAuth } from '../_contexts/AuthContext';

export function useAuthGuard() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const guardAction = useCallback(
    (callback: () => void) => {
      if (user) {
        callback();
      } else {
        setIsModalOpen(true);
      }
    },
    [user]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return { guardAction, isModalOpen, closeModal };
}
