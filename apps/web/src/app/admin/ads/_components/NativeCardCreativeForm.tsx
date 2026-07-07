'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import Image from 'next/image';

import { Field, Input, Textarea } from '@/app/admin/_components/forms';

import type { LocalizedText, NativeCardPayload } from '@/lib/ads/payload';
import type { AdSlot } from '@/lib/ads/registry';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { AdCreativeFormLabels } from '../_lib/form-labels';
import { useCommonCreativeState } from '../_lib/use-common-creative-state';
import type { CommonCreativeInitial } from '../_lib/use-common-creative-state';
import { useCreativeSubmit } from '../_lib/use-creative-submit';
import { CreativeFormShell } from './CreativeFormShell';

export type NativeCardFormInitial = CommonCreativeInitial & {
  payload: Partial<NativeCardPayload>;
};

type Props = {
  mode: 'create' | 'edit';
  slot: AdSlot;
  creativeId?: string;
  locales: readonly Locale[];
  initial: NativeCardFormInitial;
  labels: AdCreativeFormLabels;
};

/** Create/edit form for in-feed native-card creatives (avatar + localized copy). */
export function NativeCardCreativeForm({
  mode,
  slot,
  creativeId,
  locales,
  initial,
  labels,
}: Props) {
  const common = useCommonCreativeState(initial);
  const { submit, isPending, error, setError } = useCreativeSubmit(slot);

  const [avatarImagePath, setAvatarImagePath] = useState<string | null>(
    initial.payload.avatarImagePath ?? null
  );
  const [avatarAlt, setAvatarAlt] = useState(initial.payload.avatarAlt ?? 'Advertisement');
  const [title, setTitle] = useState<LocalizedText>(initial.payload.title ?? {});
  const [description, setDescription] = useState<LocalizedText>(initial.payload.description ?? {});
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarUpload = async (file: File) => {
    if (!creativeId) return;
    setError(null);
    setIsUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch(`/api/admin/ads/${creativeId}/image`, { method: 'POST', body });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'upload_failed');
        return;
      }
      const data = (await res.json()) as { avatarImagePath: string };
      setAvatarImagePath(data.avatarImagePath);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(mode, creativeId, common.toFields(), {
      avatarImagePath,
      avatarAlt,
      title,
      description,
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
    >
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
            <label className="cursor-pointer px-3 py-1.5 text-sm rounded border border-border hover:bg-secondary transition-colors">
              {isUploading ? labels.avatarUploading : labels.avatarUpload}
              <input
                id="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
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
          maxLength={255}
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium mb-1">{labels.title}</legend>
        {locales.map((loc) => (
          <Field key={loc} label={loc} htmlFor={`title-${loc}`}>
            <Input
              id={`title-${loc}`}
              type="text"
              value={title[loc] ?? ''}
              onChange={(e) => setTitle((prev) => ({ ...prev, [loc]: e.target.value }))}
              maxLength={2000}
            />
          </Field>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium mb-1">{labels.description}</legend>
        {locales.map((loc) => (
          <Field key={loc} label={loc} htmlFor={`description-${loc}`}>
            <Textarea
              id={`description-${loc}`}
              rows={2}
              value={description[loc] ?? ''}
              onChange={(e) => setDescription((prev) => ({ ...prev, [loc]: e.target.value }))}
              maxLength={2000}
            />
          </Field>
        ))}
      </fieldset>
    </CreativeFormShell>
  );
}
