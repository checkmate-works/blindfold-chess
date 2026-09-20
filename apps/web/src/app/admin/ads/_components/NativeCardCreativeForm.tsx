'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import Image from 'next/image';

import { Field, Input } from '@/app/admin/_components/forms';

import { fromLocalizedCopyDraft, toLocalizedCopyDraft } from '@/lib/ads/copy';
import type { AdSlot } from '@/lib/ads/registry';
import type { NativeCardThumbnail } from '@/lib/ads/thumbnail';
import { DEFAULT_AD_ALT, DEFAULT_NATIVE_THUMBNAIL_FEN } from '@/lib/ads/thumbnail';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { AdCreativeFormLabels } from '../_lib/form-labels';
import { useCommonCreativeState } from '../_lib/use-common-creative-state';
import type { CreativeFormInitial } from '../_lib/use-common-creative-state';
import { useCreativeImageUpload } from '../_lib/use-creative-image-upload';
import { useCreativeSubmit } from '../_lib/use-creative-submit';
import { AD_CREATIVE_LIMITS } from '../_lib/validation';
import { CreativeFormShell } from './CreativeFormShell';
import { CreativeThumbnailFields } from './CreativeThumbnailFields';
import { ImageFileButton } from './ImageFileButton';
import { LocalizedCopyFields } from './LocalizedCopyFields';
import { NativeCardPreview } from './NativeCardPreview';

type Props = {
  mode: 'create' | 'edit';
  slot: AdSlot;
  creativeId?: string;
  initial: CreativeFormInitial;
  labels: AdCreativeFormLabels;
};

/** Create/edit form for native-card creatives (thumbnail + avatar + copy). */
export function NativeCardCreativeForm({ mode, slot, creativeId, initial, labels }: Props) {
  const common = useCommonCreativeState(initial);
  const { submit, isPending, error, setError } = useCreativeSubmit(slot);

  const [avatarImagePath, setAvatarImagePath] = useState<string | null>(
    initial.avatarImagePath ?? null
  );
  const [avatarAlt, setAvatarAlt] = useState(initial.avatarAlt ?? DEFAULT_AD_ALT);
  // One input per locale. `en` is required and is what every unfilled locale
  // falls back to at render time, so the others stay optional.
  const [title, setTitle] = useState(() => toLocalizedCopyDraft(initial.title));
  const [description, setDescription] = useState(() => toLocalizedCopyDraft(initial.description));

  const setCopy = (set: typeof setTitle, locale: Locale) => (value: string) =>
    set((prev) => ({ ...prev, [locale]: value }));

  const initThumb = initial.thumbnail ?? { fen: DEFAULT_NATIVE_THUMBNAIL_FEN };
  const [thumbnailFen, setThumbnailFen] = useState(initThumb.fen);
  const [thumbnailImagePath, setThumbnailImagePath] = useState<string | null>(
    initThumb.imagePath ?? null
  );
  const [thumbnailAlt, setThumbnailAlt] = useState(initThumb.imageAlt || DEFAULT_AD_ALT);

  const { upload, remove, isBusy } = useCreativeImageUpload(creativeId, setError);
  const isUploading = isBusy('avatar');
  const isThumbUploading = isBusy('thumbnail');

  const handleAvatarUpload = async (file: File) => {
    const path = await upload('avatar', file, avatarAlt);
    if (path) setAvatarImagePath(path);
  };

  const handleThumbnailUpload = async (file: File) => {
    const path = await upload('thumbnail', file, thumbnailAlt);
    if (path) setThumbnailImagePath(path);
  };

  const removeThumbnailImage = async () => {
    // With no saved creative yet, the image only lives in local state and
    // `remove` reports success without an API call.
    if (await remove('thumbnail')) setThumbnailImagePath(null);
  };

  // The effective thumbnail from the current inputs: the board `fen` always,
  // plus the override image when one is set. Shared by the live preview and
  // submit.
  const currentThumbnail: NativeCardThumbnail = {
    fen: thumbnailFen.trim() || DEFAULT_NATIVE_THUMBNAIL_FEN,
    ...(thumbnailImagePath ? { imagePath: thumbnailImagePath, imageAlt: thumbnailAlt } : {}),
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(mode, creativeId, {
      ...common.toFields(),
      icon: null,
      avatarImagePath,
      avatarAlt,
      thumbnail: currentThumbnail,
      title: fromLocalizedCopyDraft(title),
      description: fromLocalizedCopyDraft(description),
    });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <CreativeFormShell
        common={common}
        labels={labels}
        error={error}
        isPending={isPending}
        onSubmit={handleSubmit}
        cancelHref={`/admin/ads/${slot}`}
      >
        <CreativeThumbnailFields
          mode={mode}
          labels={labels}
          fen={thumbnailFen}
          onFenChange={setThumbnailFen}
          imagePath={thumbnailImagePath}
          onUpload={handleThumbnailUpload}
          onRemove={removeThumbnailImage}
          isUploading={isThumbUploading}
          alt={thumbnailAlt}
          onAltChange={setThumbnailAlt}
        />

        <Field label={labels.avatar} htmlFor="avatar">
          <div className="flex items-center gap-3">
            {avatarImagePath ? (
              <Image
                src={avatarImagePath}
                alt={avatarAlt}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                Ad
              </div>
            )}
            {mode === 'edit' ? (
              <ImageFileButton
                idleLabel={labels.avatarUpload}
                busyLabel={labels.avatarUploading}
                busy={isUploading}
                onFile={handleAvatarUpload}
                inputId="avatar"
              />
            ) : (
              <p className="text-xs text-muted-foreground">{labels.avatarHintCreate}</p>
            )}
          </div>
        </Field>
        <Field label={labels.avatarAlt} htmlFor="avatarAlt">
          <Input
            id="avatarAlt"
            type="text"
            value={avatarAlt}
            onChange={(e) => setAvatarAlt(e.target.value)}
            maxLength={AD_CREATIVE_LIMITS.alt}
          />
        </Field>

        <LocalizedCopyFields
          labels={labels}
          title={title}
          onTitleChange={(locale, value) => setCopy(setTitle, locale)(value)}
          description={description}
          onDescriptionChange={(locale, value) => setCopy(setDescription, locale)(value)}
        />
      </CreativeFormShell>

      <aside className="lg:sticky lg:top-4">
        <NativeCardPreview
          avatarImagePath={avatarImagePath}
          avatarAlt={avatarAlt}
          title={title.en}
          description={description.en}
          thumbnail={currentThumbnail}
          label={labels.preview}
          caption={labels.previewCaption}
        />
      </aside>
    </div>
  );
}
