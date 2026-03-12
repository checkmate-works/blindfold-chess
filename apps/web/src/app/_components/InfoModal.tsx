'use client';

import type { ReactNode } from 'react';
import { useId } from 'react';

import { FaTimes } from 'react-icons/fa';

import { Modal } from '@/app/[locale]/_components/Modal';

type InfoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function InfoModal({ isOpen, onClose, title, children }: InfoModalProps) {
  const titleId = useId();

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" aria-labelledby={titleId}>
      <div className="flex items-start justify-between mb-4">
        <h2 id={titleId} className="text-xl font-bold text-foreground">
          {title}
        </h2>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Close"
        >
          <FaTimes className="w-5 h-5" />
        </button>
      </div>
      <div className="text-foreground">{children}</div>
    </Modal>
  );
}
