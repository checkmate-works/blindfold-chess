import en from '@/messages/en.json';
import es from '@/messages/es.json';
import ja from '@/messages/ja.json';
import ptBR from '@/messages/pt-BR.json';
import { describe, expect, it } from 'vitest';

import type { ChunkEditRequestValidationError } from './validation';

/**
 * Every verdict `validateSubmitEditRequest` can return, listed so this file
 * fails to compile if the union gains a member (the `satisfies` clause) and
 * fails at runtime if a locale is missing its sentence.
 *
 * The rule this guards: these codes travel to the client through the
 * mutation's `{ error }`, and `localizeChunkError` renders anything it has no
 * copy for **verbatim**. Before 2026-08 the validator returned finished
 * English sentences, so a Japanese proposer over the comment cap was told
 * "Comment must be 2000 characters or fewer".
 */
const CODES = [
  'titleTooLong',
  'titleUnchanged',
  'descriptionTooLong',
  'descriptionUnchanged',
  'nothingProposed',
  'commentTooLong',
] as const satisfies readonly ChunkEditRequestValidationError[];

const LOCALES = { en, ja, es, 'pt-BR': ptBR } as const;

describe('chunk edit-request error copy', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} has a sentence for every validation verdict`, () => {
      const errors: Record<string, string> = messages.chunks.editRequests.errors;
      for (const code of CODES) {
        expect(
          errors[code],
          `${locale} is missing chunks.editRequests.errors.${code}`
        ).toBeTruthy();
      }
    });
  }
});
