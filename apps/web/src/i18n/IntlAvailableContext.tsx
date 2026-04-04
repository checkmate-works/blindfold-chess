'use client';

import { createContext } from 'react';

/**
 * Lightweight context that signals whether `NextIntlClientProvider` is mounted
 * in the current tree. Created with a default value of `false` so that
 * `useContext(IntlAvailableContext)` returns `false` when no provider is
 * present — without throwing.
 *
 * The `<Providers>` component wraps `NextIntlClientProvider` and renders
 * `<IntlAvailableContext.Provider value={true}>` just inside it.
 */
export const IntlAvailableContext = createContext<boolean>(false);
