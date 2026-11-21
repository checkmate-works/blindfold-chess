import { getMobilePuzzle } from '@/lib/mobile-api/puzzles';
import {
  mobileError,
  mobileJson,
  mobilePreflight,
  withMobileErrors,
} from '@/lib/mobile-api/response';

export const dynamic = 'force-dynamic';

/**
 * One featured puzzle with its solution lines (the web's session page sends
 * the same lines to the browser). 404 for any puzzle that is not featured.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withMobileErrors('puzzles/[id]', async () => {
    const { id } = await params;
    const puzzle = await getMobilePuzzle(id);
    return puzzle ? mobileJson(puzzle) : mobileError('notFound', 404);
  });
}

export const OPTIONS = mobilePreflight;
