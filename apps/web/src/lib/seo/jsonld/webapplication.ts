import { LANGUAGE_MAP, SITE_URL } from './base';

/**
 * WebApplication schema for the home page
 * @see https://schema.org/WebApplication
 */
export function generateWebApplicationSchema(locale: string, brandName: string) {
  const descriptionMap: Record<string, string> = {
    en: 'A free training app for blindfold chess',
    ja: '目隠しチェスの無料練習アプリ',
    es: 'Una aplicación gratuita de entrenamiento para ajedrez a ciegas',
  };
  const description = descriptionMap[locale] ?? descriptionMap.en;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: brandName,
    url: SITE_URL,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description,
    inLanguage: Object.values(LANGUAGE_MAP),
  };
}
