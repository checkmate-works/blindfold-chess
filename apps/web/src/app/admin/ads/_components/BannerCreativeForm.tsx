'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import { Field, Input } from '@/app/admin/_components/forms';

import type { BannerPayload } from '@/lib/ads/payload';
import { DEFAULT_AD_ALT } from '@/lib/ads/payload';
import type { AdSlot } from '@/lib/ads/registry';

import type { AdCreativeFormLabels } from '../_lib/form-labels';
import { useCommonCreativeState } from '../_lib/use-common-creative-state';
import type { CommonCreativeValues } from '../_lib/use-common-creative-state';
import { useCreativeSubmit } from '../_lib/use-creative-submit';
import { AD_CREATIVE_LIMITS } from '../_lib/validation';
import { CreativeFormShell } from './CreativeFormShell';

export type BannerFormInitial = CommonCreativeValues & {
  payload: Partial<BannerPayload>;
};

type Props = {
  mode: 'create' | 'edit';
  slot: AdSlot;
  creativeId?: string;
  initial: BannerFormInitial;
  labels: AdCreativeFormLabels;
};

/** Create/edit form for image-banner creatives (content-middle / -bottom). */
export function BannerCreativeForm({ mode, slot, creativeId, initial, labels }: Props) {
  const common = useCommonCreativeState(initial);
  const { submit, isPending, error } = useCreativeSubmit(slot);

  const [imagePath, setImagePath] = useState(initial.payload.imagePath ?? '');
  const [alt, setAlt] = useState(initial.payload.alt ?? DEFAULT_AD_ALT);
  const [width, setWidth] = useState(initial.payload.width ?? 320);
  const [height, setHeight] = useState(initial.payload.height ?? 100);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(mode, creativeId, common.toFields(), { imagePath, alt, width, height });
  };

  return (
    <CreativeFormShell
      common={common}
      labels={labels}
      error={error}
      isPending={isPending}
      onSubmit={handleSubmit}
      cancelHref={`/admin/ads/${slot}`}
    >
      <Field label={labels.imagePath} htmlFor="imagePath">
        <Input
          id="imagePath"
          type="text"
          value={imagePath}
          onChange={(e) => setImagePath(e.target.value)}
          placeholder={labels.imagePathPlaceholder}
          required
          maxLength={AD_CREATIVE_LIMITS.imagePath}
        />
      </Field>
      <Field label={labels.alt} htmlFor="alt">
        <Input
          id="alt"
          type="text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder={labels.altPlaceholder}
          maxLength={AD_CREATIVE_LIMITS.alt}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={labels.width} htmlFor="width">
          <Input
            id="width"
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            required
            min={1}
          />
        </Field>
        <Field label={labels.height} htmlFor="height">
          <Input
            id="height"
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            required
            min={1}
          />
        </Field>
      </div>
    </CreativeFormShell>
  );
}
