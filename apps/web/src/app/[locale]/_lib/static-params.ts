import { SUPPORTED_LOCALES } from '@/config';

export function generateLocaleStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}
