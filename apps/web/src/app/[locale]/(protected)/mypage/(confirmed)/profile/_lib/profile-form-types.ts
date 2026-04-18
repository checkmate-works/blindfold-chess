import type { Profile } from '@/lib/db';

export type ProfileFormProps = {
  locale: string;
  profile: Profile;
};

export type ProfileFormError = { message: string; field?: string } | null;
