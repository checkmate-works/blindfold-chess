'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import { Field, Input } from '@/app/admin/_components/forms';

import type { AdSlot } from '@/lib/ads/registry';

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
import { LocalizedCopyFields } from './LocalizedCopyFields';
import { NativeTilePreview } from './NativeTilePreview';

type Props = {
  mode: 'create' | 'edit';
  slot: AdSlot;
  creativeId?: string;
  initial: CreativeFormInitial;
  labels: AdCreativeFormLabels;
};

/**
 * Create/edit form for native-tile creatives (emoji + copy + thumbnail).
 *
 * The card form's fields minus the author row, plus the emoji. Both share
 * `CreativeThumbnailFields` and `LocalizedCopyFields`, so the parts of a
 * creative that do not vary by kind are edited by the same code in both.
 */
export function NativeTileCreativeForm({ mode, slot, creativeId, initial, labels }: Props) {
  const common = useCommonCreativeState(initial);
  const { submit, isPending, error, setError } = useCreativeSubmit(slot);

  const [icon, setIcon] = useState(initial.icon ?? '');
  const copy = useLocalizedCopyState(initial);

  const images = useCreativeImageUpload(creativeId, setError);
  const thumbnail = useCreativeThumbnailState(initial.thumbnail, images);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(mode, creativeId, {
      ...common.toFields(),
      icon: icon.trim(),
      avatarImagePath: null,
      avatarAlt: null,
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
        <NativeTilePreview
          icon={icon}
          title={copy.title.en}
          description={copy.description.en}
          thumbnail={thumbnail.current}
          label={labels.preview}
          caption={labels.previewCaption}
        />
      }
    >
      <CreativeThumbnailFields mode={mode} labels={labels} {...thumbnail.fieldProps} />

      <Field label={labels.icon} htmlFor="icon" description={labels.iconHint}>
        <Input
          id="icon"
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          required
          maxLength={AD_CREATIVE_LIMITS.icon}
        />
      </Field>

      <LocalizedCopyFields labels={labels} {...copy.fieldProps} />
    </CreativeFormShell>
  );
}
