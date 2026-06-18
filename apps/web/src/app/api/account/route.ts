import { NextResponse } from 'next/server';

import { authenticateAndGuardApi } from '@/lib/auth';
import { isValidOrigin } from '@/lib/csrf';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { deleteAccount } from '@/lib/users/delete-account';

export async function DELETE(request: Request) {
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const guardResult = await authenticateAndGuardApi(RATE_LIMITS.deleteAccount);
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
