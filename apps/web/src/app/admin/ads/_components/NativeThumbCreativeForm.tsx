'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import { fromLocalizedCopyDraft, toLocalizedCopyDraft } from '@/lib/ads/copy';
import type { AdSlot } from '@/lib/ads/registry';

import type { AdCreativeFormLabels } from '../_lib/form-labels';
import { useCommonCreativeState } from '../_lib/use-common-creative-state';
import type { CreativeFormInitial } from '../_lib/use-common-creative-state';
import { useCreativeImageUpload } from '../_lib/use-creative-image-upload';
import { useCreativeSubmit } from '../_lib/use-creative-submit';
import { useCreativeThumbnailState } from '../_lib/use-creative-thumbnail-state';
import { CreativeFormShell } from './CreativeFormShell';
import { CreativeThumbnailFields } from './CreativeThumbnailFields';
import { LocalizedCopyFields } from './LocalizedCopyFields';
import { NativeThumbPreview } from './NativeThumbPreview';

type Props = {
  mode: 'create' | 'edit';
  slot: AdSlot;
  creativeId?: string;
  initial: CreativeFormInitial;
  labels: AdCreativeFormLabels;
};

/**
 * Create/edit form for native-thumb creatives (copy + thumbnail).
 *
 * The tile form's fields minus the emoji, and the smallest of the three: a
 * thumb is a destination, a thumbnail and one line of title.
 *
 * The description input is still here, and still required, because
 * `ad_creative_translations_chk_en_complete` holds the `en` row to both
 * fields — every other locale falls back to it field by field. The thumb tile
 * never draws it, and `LocalizedCopyFields` says so beside the input, so
 * nobody spends an afternoon on copy that has no place to appear.
 */
export function NativeThumbCreativeForm({ mode, slot, creativeId, initial, labels }: Props) {
  const common = useCommonCreativeState(initial);
  const { submit, isPending, error, setError } = useCreativeSubmit(slot);

  const [title, setTitle] = useState(() => toLocalizedCopyDraft(initial.title));
  const [description, setDescription] = useState(() => toLocalizedCopyDraft(initial.description));

  const images = useCreativeImageUpload(creativeId, setError);
  const thumbnail = useCreativeThumbnailState(initial.thumbnail, images);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(mode, creativeId, {
      ...common.toFields(),
      icon: null,
      avatarImagePath: null,
      avatarAlt: null,
      thumbnail: thumbnail.current,
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
        <CreativeThumbnailFields mode={mode} labels={labels} {...thumbnail.fieldProps} />

        <LocalizedCopyFields
          labels={labels}
          descriptionHint={labels.thumbDescriptionHint}
          title={title}
          onTitleChange={(locale, value) => setTitle((prev) => ({ ...prev, [locale]: value }))}
          description={description}
          onDescriptionChange={(locale, value) =>
            setDescription((prev) => ({ ...prev, [locale]: value }))
          }
        />
      </CreativeFormShell>

      <aside className="lg:sticky lg:top-4">
        <NativeThumbPreview
          title={title.en}
          thumbnail={thumbnail.current}
          label={labels.preview}
          caption={labels.previewCaption}
        />
      </aside>
    </div>
  );
}
