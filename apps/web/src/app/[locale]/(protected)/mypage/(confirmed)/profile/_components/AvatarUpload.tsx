'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import { FieldError } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import * as Sentry from '@sentry/nextjs';

import { prepareImageForUpload } from '@/lib/client-images/prepare-image-for-upload';
import { AVATAR_MAX_FILE_SIZE, isAllowedImageMimeType } from '@/lib/images/policy';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';

type Props = {
  currentAvatarUrl: string | null;
};

export function AvatarUpload({ currentAvatarUrl }: Props) {
  const t = useTranslations('profile');
  const { showToast } = useToast();
  // The header renders the avatar from the auth context, not from this page's
  // props, so a change made here is invisible up there until something
  // refetches it. Without this the user sees two different avatars at once and
  // has to reload to reconcile them.
  const { refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const isBusy = isUploading || isRemoving;

  // `URL.createObjectURL` pins the selected file in memory until the URL is
  // revoked. The optimistic preview is replaced within a request or two (by
  // the stored URL, or by a revert), so without this every attempt leaks a
  // whole image for the lifetime of the document.
  const objectUrlRef = useRef<string | null>(null);
  const setPreview = useCallback((next: string | null) => {
    if (objectUrlRef.current && objectUrlRef.current !== next) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(next);
  }, []);
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    []
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const original = e.target.files?.[0];
    if (!original) return;

    setError(null);

    // Normalize before validating: convert HEIC (iPhone default) to JPEG and
    // downscale/compress oversized images in the browser, so the client checks
    // and the server gate below see a web-safe file within limits. A file
    // already web-safe and within limits is returned untouched.
    const prepared = await prepareImageForUpload(original);
    if (!prepared.ok) {
      // Only report our own pipeline breaking. A file this browser cannot
      // decode is the user's pick, not a bug — it used to be captured under
      // the same tag, so genuine canvas failures were buried in noise.
      if (prepared.error.kind === 'encode-failed') {
        Sentry.captureException(prepared.error.cause, {
          tags: { feature: 'avatar-upload', phase: 'prepare' },
          extra: { name: original.name, type: original.type, size: original.size },
        });
      }
      setError(t('avatarConversionFailed'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const file = prepared.value;

    if (!isAllowedImageMimeType(file.type)) {
      setError(t('avatarInvalidType'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > AVATAR_MAX_FILE_SIZE) {
      setError(t('avatarTooLarge'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    objectUrlRef.current = localPreview;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        switch (data.error) {
          case 'invalid_file_type':
            setError(t('avatarInvalidType'));
            break;
          case 'file_too_large':
            setError(t('avatarTooLarge'));
            break;
          default:
            setError(t('avatarUploadFailed'));
        }
        // Revert preview on error
        setPreview(previewUrl);
        return;
      }

      const { avatarUrl } = await res.json();
      setPreview(avatarUrl);
      void refreshUser();
      showToast(t('avatarUploaded'), 'success');
    } catch {
      setError(t('avatarUploadFailed'));
      setPreview(previewUrl);
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    setError(null);
    setRemoveError(null);
    setIsRemoving(true);
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' });

      if (!res.ok) {
        // Reported inside the dialog rather than behind it: the dialog stays
        // open on failure, so the message has to be where the user is looking.
        setRemoveError(t('avatarRemoveFailed'));
        return;
      }

      setPreview(null);
      setIsRemoveConfirmOpen(false);
      void refreshUser();
      showToast(t('avatarRemoved'), 'success');
    } catch {
      setRemoveError(t('avatarRemoveFailed'));
    } finally {
      setIsRemoving(false);
    }
  };

  const closeRemoveConfirm = () => {
    if (isRemoving) return;
    setIsRemoveConfirmOpen(false);
    setRemoveError(null);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/*
        The remove control overlaps the avatar, so it cannot live inside the
        picker button — nesting one button in another is invalid HTML and
        browsers recover from it unpredictably. They are siblings in a
        positioning wrapper instead.
      */}
      <div className="relative">
        {/* The rejection is about the file just chosen, so it is described by
            this button rather than the file input — that input is hidden (the
            button opens the picker) and so can be neither focused nor
            announced. */}
        <button
          type="button"
          onClick={handleClick}
          disabled={isBusy}
          aria-invalid={error !== null || undefined}
          aria-describedby={error ? 'avatar-error' : undefined}
          className={`relative block h-24 w-24 rounded-full overflow-hidden border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-destructive' : 'border-border hover:border-accent'
          }`}
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={t('avatarAlt')}
              fill
              sizes="96px"
              className="object-cover"
              // Pre-resized 256×256 WebP at upload (and the live preview is a
              // local blob: URL anyway); bypass Vercel optimization.
              unoptimized
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-3xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-10 w-10"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          )}
          {isBusy && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            </span>
          )}
        </button>

        {/*
          Shown only when there is something to remove. The ring keeps the
          badge's outline readable on top of an arbitrary photo, which a flat
          circle would lose against a light background.
        */}
        {previewUrl && (
          <button
            type="button"
            onClick={() => setIsRemoveConfirmOpen(true)}
            disabled={isBusy}
            aria-label={t('avatarRemove')}
            title={t('avatarRemove')}
            className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background ring-2 ring-background transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={handleChange}
        className="hidden"
        aria-label={t('avatarUploadLabel')}
      />
      <p className="text-xs text-muted-foreground">{t('avatarHint')}</p>
      <FieldError id="avatar-error" message={error} />

      <ConfirmationModal
        isOpen={isRemoveConfirmOpen}
        title={t('avatarRemoveConfirmTitle')}
        message={t('avatarRemoveConfirmMessage')}
        error={removeError}
        confirmText={t('avatarRemoveConfirmOk')}
        cancelText={t('avatarRemoveConfirmCancel')}
        confirmVariant="danger"
        isLoading={isRemoving}
        onConfirm={handleRemove}
        onCancel={closeRemoveConfirm}
      />
    </div>
  );
}
