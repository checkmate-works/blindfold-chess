'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';

import { NextIntlClientProvider } from 'next-intl';
import { NavigationGuardProvider } from 'next-navigation-guard';

import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { IntlAvailableContext } from '@/i18n/IntlAvailableContext';
import { getMessageFallback, handleIntlError } from '@/i18n/error-handling';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { ThemeProvider } from '@/lib/theme/ThemeProvider';

import { NullHistoryStateRecovery } from '../_components/NullHistoryStateRecovery';
import { ToastContainer } from '../_components/ToastContainer';
import { AuthProvider } from '../_contexts/AuthContext';
import { ToastProvider } from '../_contexts/ToastContext';

type Props = {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
};

export function Providers({ children, locale, messages }: Props) {
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
          <ThemeProvider disableTransitionOnChange>
            <NavigationGuardProvider>
              <NuqsAdapter>
                <AuthProvider>
                  <ToastProvider>
                    {children}
                    <Suspense>
                      <ToastContainer />
                      {/* Inside the guard provider on purpose — its layout
                          effect must run before NavigationGuardProvider's, see
                          the component TSDoc. `useSearchParams` needs the same
                          Suspense boundary as ToastContainer. */}
                      <NullHistoryStateRecovery />
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
