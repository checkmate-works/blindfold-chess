'use client';

import { ChangeEvent, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

type Props = {
  currentAvatarUrl: string | null;
  onUploaded: (url: string) => void;
};

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export function AvatarUpload({ currentAvatarUrl, onUploaded }: Props) {
  const t = useTranslations('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('avatarInvalidType'));
      return;
    }

    if (file.size > MAX_SIZE) {
      setError(t('avatarTooLarge'));
      return;
    }

    // Show local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

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
        setPreviewUrl(currentAvatarUrl);
        return;
      }

      const { avatarUrl } = await res.json();
      setPreviewUrl(avatarUrl);
      onUploaded(avatarUrl);
    } catch {
      setError(t('avatarUploadFailed'));
      setPreviewUrl(currentAvatarUrl);
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isUploading}
        className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-border hover:border-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {previewUrl ? (
          <Image src={previewUrl} alt={t('avatarAlt')} fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-3xl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-10 w-10"
            >
              <path
                fillRule="evenodd"
                d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
        aria-label={t('avatarUploadLabel')}
      />
      <p className="text-xs text-muted-foreground">{t('avatarHint')}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
