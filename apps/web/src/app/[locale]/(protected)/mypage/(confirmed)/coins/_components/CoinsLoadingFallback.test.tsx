import en from '@/messages/en.json';
import es from '@/messages/es.json';
import ja from '@/messages/ja.json';
import ptBR from '@/messages/pt-BR.json';
import { describe, expect, it } from 'vitest';

import { TEXT_BY_LOCALE } from './CoinsLoadingFallback';

const MESSAGES = { en, ja, es, 'pt-BR': ptBR } as const;

/**
 * The fallback renders its title and section heading from strings duplicated
 * in code (it cannot await the message catalog — see the map's doc). This
 * pins the duplicate to the catalog so a retitled page cannot leave the
 * skeleton announcing the old name.
 */
describe('CoinsLoadingFallback locale strings', () => {
  it.each(Object.keys(MESSAGES) as Array<keyof typeof MESSAGES>)(
    'matches the %s message catalog',
    (locale) => {
      expect(TEXT_BY_LOCALE[locale]).toEqual({
        title: MESSAGES[locale].MypagePoints.title,
        section: MESSAGES[locale].MypagePoints.sectionTitle,
      });
    }
  );
});
