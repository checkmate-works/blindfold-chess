import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { getMessageFallback, handleIntlError } from './error-handling';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  let messages: Record<string, unknown>;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        `[next-intl] Failed to load messages for locale "${locale}", using empty messages as fallback.`,
        error
      );
    }
    messages = {};
  }

  return {
    locale,
    messages,
    timeZone: 'UTC',
    onError: handleIntlError,
    getMessageFallback,
  };
});
