'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import Image from 'next/image';

import { Field, Input } from '@/app/admin/_components/forms';

import type { AdSlot } from '@/lib/ads/registry';
import { DEFAULT_AD_ALT } from '@/lib/ads/thumbnail';

import type { AdCreativeFormLabels } from '../_lib/form-labels';
import { useCommonCreativeState } from '../_lib/use-common-creative-state';
import type { CreativeFormInitial } from '../_lib/use-common-creative-state';
import { useCreativeImageUpload } from '../_lib/use-creative-image-upload';
import { useCreativeSubmit } from '../_lib/use-creative-submit';
import { useCreativeThumbnailState } from '../_lib/use-creative-thumbnail-state';
import { useLocalizedCopyState } from '../_lib/use-localized-copy-state';
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
  const copy = useLocalizedCopyState(initial);

  const images = useCreativeImageUpload(creativeId, setError);
  const isUploading = images.isBusy('avatar');
  const thumbnail = useCreativeThumbnailState(initial.thumbnail, images);

  const handleAvatarUpload = async (file: File) => {
    const path = await images.upload('avatar', file, avatarAlt);
    if (path) setAvatarImagePath(path);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(mode, creativeId, {
      ...common.toFields(),
      icon: null,
      avatarImagePath,
      avatarAlt,
      thumbnail: thumbnail.current,
      ...copy.toFields(),
    });
  };

  return (
    <CreativeFormShell
      common={common}
      labels={labels}
      error={error}
      isPending={isPending}
      onSubmit={handleSubmit}
      cancelHref={`/admin/ads/${slot}`}
      preview={
        <NativeCardPreview
          avatarImagePath={avatarImagePath}
          avatarAlt={avatarAlt}
          title={copy.title.en}
          description={copy.description.en}
          thumbnail={thumbnail.current}
          label={labels.preview}
          caption={labels.previewCaption}
        />
      }
    >
      <CreativeThumbnailFields mode={mode} labels={labels} {...thumbnail.fieldProps} />

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

      <LocalizedCopyFields labels={labels} {...copy.fieldProps} />
    </CreativeFormShell>
  );
}
