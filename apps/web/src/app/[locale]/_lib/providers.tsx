'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';

import { NavigationGuardProvider } from 'next-navigation-guard';

import { IntlThemeShell } from '@/app/_components/IntlThemeShell';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { HistoryTraversalRecovery } from '../_components/HistoryTraversalRecovery';
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
    <IntlThemeShell locale={locale} messages={messages}>
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
                <HistoryTraversalRecovery />
              </Suspense>
            </ToastProvider>
          </AuthProvider>
        </NuqsAdapter>
      </NavigationGuardProvider>
    </IntlThemeShell>
  );
}
