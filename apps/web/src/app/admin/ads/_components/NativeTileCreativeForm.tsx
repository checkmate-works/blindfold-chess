'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import { Field, Input } from '@/app/admin/_components/forms';

import { fromLocalizedCopyDraft, toLocalizedCopyDraft } from '@/lib/ads/copy';
import type { AdSlot } from '@/lib/ads/registry';

import type { AdCreativeFormLabels } from '../_lib/form-labels';
import { useCommonCreativeState } from '../_lib/use-common-creative-state';
import type { CreativeFormInitial } from '../_lib/use-common-creative-state';
import { useCreativeImageUpload } from '../_lib/use-creative-image-upload';
import { useCreativeSubmit } from '../_lib/use-creative-submit';
import { useCreativeThumbnailState } from '../_lib/use-creative-thumbnail-state';
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
  const [title, setTitle] = useState(() => toLocalizedCopyDraft(initial.title));
  const [description, setDescription] = useState(() => toLocalizedCopyDraft(initial.description));

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

        <LocalizedCopyFields
          labels={labels}
          title={title}
          onTitleChange={(locale, value) => setTitle((prev) => ({ ...prev, [locale]: value }))}
          description={description}
          onDescriptionChange={(locale, value) =>
            setDescription((prev) => ({ ...prev, [locale]: value }))
          }
        />
      </CreativeFormShell>

      <aside className="lg:sticky lg:top-4">
        <NativeTilePreview
          icon={icon}
          title={title.en}
          description={description.en}
          thumbnail={thumbnail.current}
          label={labels.preview}
          caption={labels.previewCaption}
        />
      </aside>
    </div>
  );
}
