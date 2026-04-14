'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { createPortal } from 'react-dom';
import { FaHome } from 'react-icons/fa';

import { useScrollLock } from '../_hooks/use-scroll-lock';
import { getIcon } from '../_lib/icon-mapping';
import type { NavigationItem } from '../_lib/types';
import { CloseButton } from './CloseButton';

type Props = {
  title: string;
  items: NavigationItem[];
};

export function MobileMenu({ title, items }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useScrollLock(isOpen);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md text-muted-foreground hover:bg-accent"
        aria-label="Menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile menu overlay */}
      {mounted &&
        createPortal(
          <>
            {isOpen && (
              <div
                className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40"
                onClick={() => setIsOpen(false)}
              />
            )}

            {/* Mobile menu panel */}
            <div
              className={`fixed inset-y-0 left-0 z-50 w-64 bg-card shadow-lg transform transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <div className="flex items-center justify-between h-14 px-4 border-b border-border">
                <span className="text-lg font-semibold text-foreground">{title}</span>
                <CloseButton
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-md text-muted-foreground hover:bg-accent"
                />
              </div>

              <nav className="px-4 py-6 space-y-2">
                {items.map((item) => {
                  const icon =
                    item.iconName === 'home' ? (
                      <FaHome className="h-5 w-5" />
                    ) : (
                      getIcon(item.iconName)
                    );
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-accent rounded-md"
                    >
                      {icon}
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
