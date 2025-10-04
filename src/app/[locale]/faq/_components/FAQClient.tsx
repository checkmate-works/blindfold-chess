'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { FaChevronDown } from 'react-icons/fa';

import { PageTitle } from '@/app/[locale]/_components/PageTitle';

import type { FAQItem } from '../_lib/types';

export function FAQClient() {
  const t = useTranslations('faq');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const faqItems: FAQItem[] = [
    {
      id: 'invalid-move',
      question: t('items.invalidMove.question'),
      answer: t.rich('items.invalidMove.answer', {
        settingsLink: (chunks) => (
          <Link
            href="/preferences?tab=game-settings"
            className="text-foreground underline hover:opacity-80 transition-colors"
          >
            {chunks}
          </Link>
        ),
      }),
    },
  ];

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>

      <p className="text-muted-foreground">{t('description')}</p>

      <div className="space-y-4">
        {faqItems.map((item) => {
          const isExpanded = expandedItems.has(item.id);

          return (
            <div key={item.id} className="bg-card rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full px-6 py-4 text-left hover:bg-muted/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-foreground pr-4">{item.question}</h2>
                  <FaChevronDown
                    className={`w-5 h-5 text-muted-foreground transform transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              <div
                className={`px-6 pb-4 text-muted-foreground transition-all duration-200 ${
                  isExpanded ? 'block' : 'hidden'
                }`}
              >
                <div className="pt-2">{item.answer}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
