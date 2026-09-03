import en from '@/messages/en.json';
import es from '@/messages/es.json';
import ja from '@/messages/ja.json';
import ptBR from '@/messages/pt-BR.json';
import { describe, expect, it } from 'vitest';

/**
 * Copy coverage for the `profileRequired` rejection.
 *
 * `authenticateGuardAndRequireProfile` turns a provisional user — confirmed
 * session, no `profiles` row — away from any write that would be publicly
 * attributed to them. Each screen that can now receive that verdict renders it
 * through `localizeActionError` / `localizeActionErrorOrGeneric`, and the
 * former prints a code it has no copy for **verbatim**: a proposer would see
 * the bare token `profileRequired` in the error banner. So every namespace
 * whose action can return it needs the sentence, in every locale.
 *
 * Add a path here whenever another surface starts surfacing the verdict.
 */
const MESSAGE_PATHS = [
  // createChunkEntry, via ChunkPreviewClient's PREVIEW_ERROR_CODES.
  ['chunks', 'form', 'errors', 'profileRequired'],
  // submitEditRequestEntry, via EditRequestForm's WELL_KNOWN_ERRORS.
  ['chunks', 'editRequests', 'errors', 'profileRequired'],
  // createRepertoireEntry, via RepertoireImportForm's catalogue lookup.
  ['Repertoires', 'errors', 'profileRequired'],
  // submitPositionEditRequestEntry, via PositionEditRequestForm.
  ['practice', 'positionEditRequests', 'errors', 'profileRequired'],
  // createPositionEntry, one path per authoring flow.
  ['practice', 'positionMemory', 'preview', 'errors', 'profileRequired'],
  ['practice', 'puzzle', 'preview', 'errors', 'profileRequired'],
] as const;

const LOCALES = { en, ja, es, 'pt-BR': ptBR } as const;

function read(messages: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>(
    (node, key) => (node == null ? undefined : (node as Record<string, unknown>)[key]),
    messages
  );
}

describe('profileRequired error copy', () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    it(`${locale} has a sentence for every surface that can reject a provisional user`, () => {
      for (const path of MESSAGE_PATHS) {
        expect(read(messages, path), `${locale} is missing ${path.join('.')}`).toBeTruthy();
      }
    });
  }
});
