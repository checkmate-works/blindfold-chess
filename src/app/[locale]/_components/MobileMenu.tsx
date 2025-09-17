'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FaHome,
  FaGraduationCap,
  FaDumbbell,
  FaBook,
  FaQuestionCircle,
  FaList,
} from 'react-icons/fa';
import type { NavigationItem } from '../_lib/types';

interface MobileMenuProps {
  title: string;
  items: NavigationItem[];
}

export function MobileMenu({ title, items }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 shadow-lg transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="px-4 py-6 space-y-2">
          {items.map((item) => {
            const getIcon = () => {
              switch (item.iconName) {
                case 'home':
                  return <FaHome className="h-5 w-5" />;
                case 'learn':
                  return <FaGraduationCap className="h-5 w-5" />;
                case 'practice':
                  return <FaDumbbell className="h-5 w-5" />;
                case 'manual':
                  return <FaBook className="h-5 w-5" />;
                case 'faq':
                  return <FaQuestionCircle className="h-5 w-5" />;
                case 'glossary':
                  return <FaList className="h-5 w-5" />;
                default:
                  return null;
              }
            };
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                {getIcon()}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
