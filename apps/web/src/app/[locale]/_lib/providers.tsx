'use client';

import { ReactNode, Suspense } from 'react';

import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';

import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { ToastContainer } from '../_components/ToastContainer';
import { AuthProvider } from '../_contexts/AuthContext';
import { GamePreferencesProvider } from '../_contexts/GamePreferencesContext';
import { ToastProvider } from '../_contexts/ToastContext';

type Props = {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
};

export function Providers({ children, locale, messages }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <NuqsAdapter>
          <AuthProvider>
            <GamePreferencesProvider>
              <ToastProvider>
                {children}
                <Suspense>
                  <ToastContainer />
                </Suspense>
              </ToastProvider>
            </GamePreferencesProvider>
          </AuthProvider>
        </NuqsAdapter>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
