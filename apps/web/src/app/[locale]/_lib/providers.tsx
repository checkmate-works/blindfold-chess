'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';

import { NextIntlClientProvider } from 'next-intl';
import { NavigationGuardProvider } from 'next-navigation-guard';
import { ThemeProvider } from 'next-themes';

import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import { getMessageFallback, handleIntlError } from '@/i18n/error-handling';
import type { User } from '@supabase/supabase-js';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { ToastContainer } from '../_components/ToastContainer';
import { AuthProvider } from '../_contexts/AuthContext';
import { ToastProvider } from '../_contexts/ToastContext';

type Props = {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
  initialUser?: User | null;
};

export function Providers({ children, locale, messages, initialUser = null }: Props) {
  return (
    <ErrorBoundary autoRecover>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="UTC"
        onError={handleIntlError}
        getMessageFallback={getMessageFallback}
      >
        <IntlAvailableContext.Provider value={true}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NavigationGuardProvider>
              <NuqsAdapter>
                <AuthProvider initialUser={initialUser}>
                  <ToastProvider>
                    {children}
                    <Suspense>
                      <ToastContainer />
                    </Suspense>
                  </ToastProvider>
                </AuthProvider>
              </NuqsAdapter>
            </NavigationGuardProvider>
          </ThemeProvider>
        </IntlAvailableContext.Provider>
      </NextIntlClientProvider>
    </ErrorBoundary>
  );
}
