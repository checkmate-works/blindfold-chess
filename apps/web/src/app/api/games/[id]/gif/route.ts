import { getGameById } from '@/lib/db/games-read';
import type { GameGifVariant } from '@/lib/games/gif/constants';
import { PLAYED_GIF_RENDER_VERSION } from '@/lib/games/gif/constants';
import { generateGameGif } from '@/lib/games/gif/generate-game-gif';
import { createAdminClient } from '@/lib/supabase/admin';
import { UUID_RE } from '@/lib/validations/uuid';

// sharp (native libvips) cannot run on the Edge runtime.
export const runtime = 'nodejs';
export const maxDuration = 60;

const GIFS_BUCKET = 'game-gifs';

function gifStorageKey(id: string, variant: GameGifVariant): string {
  // 'played' output changes whenever PLAYED_GIF_RENDER_VERSION bumps, so its
  // Storage key carries the version — an old render never shadows a new one.
  // 'plain' output never changes, so its key stays unversioned.
  return variant === 'played'
    ? `gifs/${id}/played-v${PLAYED_GIF_RENDER_VERSION}.gif`
    : `gifs/${id}/plain.gif`;
}

function gifResponse(buffer: Buffer, id: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/gif',
      'Content-Disposition': `attachment; filename="blindfold-chess-${id}.gif"`,
      // Deterministic from the game row (moves + playSettings +
      // playSettingsLog + operationLogs + undoneLogs) — genuinely immutable
      // for a given render version, safe to cache forever. The version lives
      // in the 'played' Storage key (see gifStorageKey), so a render-rule
      // change never collides with a previously cached response.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return new Response('Not Found', { status: 404 });
  }

  const view = new URL(request.url).searchParams.get('view');
  const variant = view === 'played' ? 'played' : 'plain';

  const detail = await getGameById(id);
  if (!detail) {
    return new Response('Not Found', { status: 404 });
  }

  const supabase = createAdminClient();
  const key = gifStorageKey(id, variant);

  const { data: cached } = await supabase.storage.from(GIFS_BUCKET).download(key);
  if (cached) {
    return gifResponse(Buffer.from(await cached.arrayBuffer()), id);
  }

  const buffer = await generateGameGif(detail.game, variant);

  // A concurrent request racing this one would generate the same bytes from
  // the same immutable move list, so upsert is safe without a lock — the
  // Storage write is simply idempotent.
  const { error: uploadError } = await supabase.storage
    .from(GIFS_BUCKET)
    .upload(key, buffer, { contentType: 'image/gif', upsert: true });
  if (uploadError) {
    console.warn('games/[id]/gif: failed to cache generated GIF', key, uploadError);
  }

  return gifResponse(buffer, id);
}
