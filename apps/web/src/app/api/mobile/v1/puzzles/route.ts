import { listMobilePuzzles } from '@/lib/mobile-api/puzzles';
import { mobileJson, mobilePreflight, withMobileErrors } from '@/lib/mobile-api/response';

export const dynamic = 'force-dynamic';

/** The Daily Puzzle and the featured puzzles. Public: no sign-in needed. */
export async function GET() {
  return withMobileErrors('puzzles', async () => mobileJson(await listMobilePuzzles()));
}

export const OPTIONS = mobilePreflight;
