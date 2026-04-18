'use client';

import type { FormEvent } from 'react';
import { useReducer, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { Profile } from '@/lib/db';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import type { ProfileFormError } from '../_lib/profile-form-types';
import {
  type ProfileFields,
  SERVER_ERROR_MAP,
  validateProfileFields,
} from '../_lib/profile-validation';

type FieldAction =
  | { type: 'SET_FIELD'; field: keyof ProfileFields; value: string }
  | { type: 'RESET'; payload: ProfileFields };

function fieldsReducer(state: ProfileFields, action: FieldAction): ProfileFields {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return action.payload;
  }
}

function initFields(profile: Profile): ProfileFields {
  return {
    displayName: profile.displayName ?? '',
    bio: profile.bio ?? '',
    country: profile.country ?? '',
    flair: profile.flair ?? '',
    fideId: profile.fideId ?? '',
    chesscomUsername: profile.chesscomUsername ?? '',
    lichessUsername: profile.lichessUsername ?? '',
    xUsername: profile.xUsername ?? '',
    instagramUsername: profile.instagramUsername ?? '',
    youtubeHandle: profile.youtubeHandle ?? '',
  };
}

/**
 * Owns the profile form state (reducer) and submission flow (validation,
 * PUT to `/api/profile`, toast notification, server error mapping).
 */
export function useProfileForm(profile: Profile) {
  const t = useTranslations('profile');
  const router = useRouter();
  const { showToast } = useToast();
  const [fields, dispatch] = useReducer(fieldsReducer, profile, initFields);
  const [error, setError] = useState<ProfileFormError>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field: keyof ProfileFields) => (value: string) => {
    dispatch({ type: 'SET_FIELD', field, value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationError = validateProfileFields(fields);
    if (validationError) {
      setError({ message: t(validationError.messageKey), field: validationError.field });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: fields.displayName.trim(),
          bio: fields.bio.trim() || undefined,
          country: fields.country || undefined,
          flair: fields.flair || undefined,
          fideId: fields.fideId.trim() || undefined,
          chesscomUsername: fields.chesscomUsername.trim() || undefined,
          lichessUsername: fields.lichessUsername.trim() || undefined,
          xUsername: fields.xUsername.trim() || undefined,
          instagramUsername: fields.instagramUsername.trim() || undefined,
          youtubeHandle: fields.youtubeHandle.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const mapped = SERVER_ERROR_MAP[data.error as string];
        if (mapped) {
          setError({ message: t(mapped.messageKey), field: mapped.field });
        } else {
          setError({ message: t('error') });
        }
        setIsSubmitting(false);
        return;
      }

      showToast(t('profileUpdated'), 'success');
      router.refresh();
      setIsSubmitting(false);
    } catch {
      setError({ message: t('error') });
      setIsSubmitting(false);
    }
  };

  return {
    t,
    fields,
    setField,
    error,
    isSubmitting,
    handleSubmit,
  };
}
