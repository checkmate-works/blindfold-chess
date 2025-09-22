'use client';

import { ThemeProvider } from 'next-themes';
import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';
import { ToastProvider } from '../_contexts/ToastContext';
import { ToastContainer } from '../_components/ToastContainer';
import { GamePreferencesProvider } from '../_contexts/GamePreferencesContext';

interface ProvidersProps {
  children: ReactNode;
  locale: string;
  messages: Record<string, unknown>;
}

export function Providers({ children, locale, messages }: ProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <GamePreferencesProvider>
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </GamePreferencesProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
