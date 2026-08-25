import en from '@/messages/en.json';
import es from '@/messages/es.json';
import ja from '@/messages/ja.json';
import ptBR from '@/messages/pt-BR.json';
import { describe, expect, it, vi } from 'vitest';

import { TEXT_BY_LOCALE } from './CoinsLoadingFallback';

// The map lives beside the JSX, so importing it pulls in the shared
// `_components` barrel and, through it, the locale-aware `Link` that
// next-intl's `createNavigation` builds. Loading that under vitest fails
// outright — next-intl's ESM build asks for `next/navigation`, and pnpm's
// isolated store has no `next` inside next-intl's own `node_modules`, so the
// whole file errors before a single assertion runs. The shared mock
// (`src/i18n/__mocks__/routing.ts`) short-circuits the chain.
vi.mock('@/i18n/routing');

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
