import { NextResponse } from 'next/server';

import { guardApiMutation } from '@/lib/api-mutation-guard';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { deleteAccount } from '@/lib/users/delete-account';

export async function DELETE(request: Request) {
  const guardResult = await guardApiMutation(request, RATE_LIMITS.deleteAccount);
  if ('response' in guardResult) {
    return guardResult.response;
  }
  const { user } = guardResult;

  const result = await deleteAccount(user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
