'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';

import { IntlThemeShell } from '@/app/_components/IntlThemeShell';

import { ToastContainer } from '@/app/[locale]/_components/ToastContainer';
import { GamePreferencesProvider } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { ToastProvider } from '@/app/[locale]/_contexts/ToastContext';

type Props = {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
};

export function Providers({ children, locale, messages }: Props) {
  return (
    <IntlThemeShell locale={locale} messages={messages}>
      {/*
        The landing route (`/`) is its own root layout, so it needs its
        own toast plumbing — toasts deferred via sessionStorage when
        leaving a `/[locale]/…` page (e.g. the "game saved" toast) are
        otherwise never consumed here. `locale` is passed explicitly
        because `/` has no `[locale]` URL segment for `useParams`.
      */}
      <ToastProvider>
        <GamePreferencesProvider>{children}</GamePreferencesProvider>
        <Suspense>
          <ToastContainer locale={locale} />
        </Suspense>
      </ToastProvider>
    </IntlThemeShell>
  );
}
