import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { authenticateAndGuardApi } from '@/lib/auth';
import { db, profiles } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: Request) {
  const guardResult = await authenticateAndGuardApi(RATE_LIMITS.uploadAvatar);
  if ('response' in guardResult) {
    return guardResult.response;
  }
  const { user } = guardResult;

  const supabase = await createClient();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file_required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
  }

  const ext = EXTENSION_MAP[file.type];
  const filePath = `${user.id}/avatar.${ext}`;

  const buffer = await file.arrayBuffer();

  const header = new Uint8Array(buffer.slice(0, 12));
  const isJPEG = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPNG =
    header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const isWebP =
    header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  if (!isJPEG && !isPNG && !isWebP) {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 });
  }

  const { data: existingFiles } = await supabase.storage.from('avatars').list(user.id);
  if (existingFiles?.length) {
    await supabase.storage.from('avatars').remove(existingFiles.map((f) => `${user.id}/${f.name}`));
  }

  const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

  // Append timestamp to bust cache when avatar is updated
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  await db
    .update(profiles)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(profiles.id, user.id));

  return NextResponse.json({ avatarUrl });
}
