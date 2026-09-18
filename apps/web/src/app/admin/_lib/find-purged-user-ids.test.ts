import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { findPurgedUserIds } from './find-purged-user-ids';

const LIVE = '11111111-1111-4111-8111-111111111111';
const PURGED = '22222222-2222-4222-8222-222222222222';
const FLAKY = '33333333-3333-4333-8333-333333333333';

type GetUserByIdResult = Awaited<ReturnType<SupabaseClient['auth']['admin']['getUserById']>>;

function makeClient(responses: Record<string, GetUserByIdResult>) {
  const getUserById = vi.fn(async (id: string) => responses[id]);
  return {
    client: { auth: { admin: { getUserById } } } as unknown as SupabaseClient,
    getUserById,
  };
}

const found = { data: { user: { id: LIVE } }, error: null } as unknown as GetUserByIdResult;
const notFound = {
  data: { user: null },
  error: { status: 404, message: 'User not found' },
} as unknown as GetUserByIdResult;
const serverError = {
  data: { user: null },
  error: { status: 500, message: 'unavailable' },
} as unknown as GetUserByIdResult;

describe('findPurgedUserIds', () => {
  it('reports the ids auth no longer knows', async () => {
    const { client } = makeClient({ [LIVE]: found, [PURGED]: notFound });

    expect(await findPurgedUserIds(client, [LIVE, PURGED])).toEqual(new Set([PURGED]));
  });

  it('leaves an id out when the lookup failed for any other reason', async () => {
    const { client } = makeClient({ [FLAKY]: serverError });

    expect(await findPurgedUserIds(client, [FLAKY])).toEqual(new Set());
  });

  it('asks nothing when there is nothing to ask about', async () => {
    const { client, getUserById } = makeClient({});

    expect(await findPurgedUserIds(client, [])).toEqual(new Set());
    expect(getUserById).not.toHaveBeenCalled();
  });
});
