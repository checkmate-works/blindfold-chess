'use client';

import { useState, useTransition } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button, Field, Input, Select, Textarea } from '@/app/admin/_components/forms';

import type { BannerPayload, LocalizedText, NativeCardPayload } from '@/lib/ads/payload';
import { AD_SLOT_VALUES, kindForSlot } from '@/lib/ads/registry';
import type { AdKind, AdSlot } from '@/lib/ads/registry';

import type { Locale } from '@/app/[locale]/_lib/types';

import { createAdCreative } from '../_actions/createAdCreative';
import { updateAdCreative } from '../_actions/updateAdCreative';

export type AdCreativeFormLabels = {
  slot: string;
  kind: string;
  href: string;
  hrefPlaceholder: string;
  isActive: string;
  sortOrder: string;
  startAt: string;
  endAt: string;
  imagePath: string;
  imagePathPlaceholder: string;
  alt: string;
  altPlaceholder: string;
  width: string;
  height: string;
  avatar: string;
  avatarAlt: string;
  avatarUpload: string;
  avatarUploading: string;
  avatarHintCreate: string;
  title: string;
  description: string;
  save: string;
  saving: string;
  cancel: string;
};

export type AdCreativeFormInitial = {
  slot: AdSlot;
  href: string;
  isActive: boolean;
  sortOrder: number;
  startAt: string;
  endAt: string;
  payload: BannerPayload | NativeCardPayload;
};

type Props = {
  mode: 'create' | 'edit';
  /** Required in edit mode — enables the avatar uploader. */
  creativeId?: string;
  locales: readonly Locale[];
  initial: AdCreativeFormInitial;
  labels: AdCreativeFormLabels;
};

function emptyLocalized(): LocalizedText {
  return {};
}

export function AdCreativeForm({ mode, creativeId, locales, initial, labels }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slot, setSlot] = useState<AdSlot>(initial.slot);
  const kind: AdKind = kindForSlot(slot);

  const [href, setHref] = useState(initial.href);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [sortOrder, setSortOrder] = useState(initial.sortOrder);
  const [startAt, setStartAt] = useState(initial.startAt);
  const [endAt, setEndAt] = useState(initial.endAt);

  const bannerInit = initial.payload as Partial<BannerPayload>;
  const [imagePath, setImagePath] = useState(bannerInit.imagePath ?? '');
  const [alt, setAlt] = useState(bannerInit.alt ?? 'Advertisement');
  const [width, setWidth] = useState(bannerInit.width ?? 320);
  const [height, setHeight] = useState(bannerInit.height ?? 100);

  const nativeInit = initial.payload as Partial<NativeCardPayload>;
  const [avatarImagePath, setAvatarImagePath] = useState<string | null>(
    nativeInit.avatarImagePath ?? null
  );
  const [avatarAlt, setAvatarAlt] = useState(nativeInit.avatarAlt ?? 'Advertisement');
  const [title, setTitle] = useState<LocalizedText>(nativeInit.title ?? emptyLocalized());
  const [description, setDescription] = useState<LocalizedText>(
    nativeInit.description ?? emptyLocalized()
  );

  const [isUploading, setIsUploading] = useState(false);

  const buildPayload = (): BannerPayload | NativeCardPayload =>
    kind === 'banner'
      ? { imagePath, alt, width, height }
      : { avatarImagePath, avatarAlt, title, description };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = buildPayload();
      if (mode === 'create') {
        const result = await createAdCreative({
          slot,
          href,
          isActive,
          sortOrder,
          startAt: startAt || null,
          endAt: endAt || null,
          payload,
        });
        if ('error' in result) {
          setError(result.error);
        } else {
          // Redirect to edit so a native card's avatar can be uploaded next.
          router.push(`/admin/ads/${result.id}/edit`);
        }
      } else if (creativeId) {
        const result = await updateAdCreative(creativeId, {
          href,
          isActive,
          sortOrder,
          startAt: startAt || null,
          endAt: endAt || null,
          payload,
        });
        if ('error' in result) {
          setError(result.error);
        } else {
          router.push('/admin/ads');
        }
      }
    });
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-lg p-6 space-y-4"
      >
        <Field label={labels.slot} htmlFor="slot">
          {mode === 'create' ? (
            <Select id="slot" value={slot} onChange={(e) => setSlot(e.target.value as AdSlot)}>
              {AD_SLOT_VALUES.map((s) => (
                <option key={s} value={s}>
                  {s} ({kindForSlot(s)})
                </option>
              ))}
            </Select>
          ) : (
            <p className="text-sm">
              {slot} <span className="text-muted-foreground">({kind})</span>
            </p>
          )}
        </Field>

        <Field label={labels.href} htmlFor="href">
          <Input
            id="href"
            type="text"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder={labels.hrefPlaceholder}
            required
            maxLength={2048}
          />
        </Field>

        {kind === 'banner' ? (
          <>
            <Field label={labels.imagePath} htmlFor="imagePath">
              <Input
                id="imagePath"
                type="text"
                value={imagePath}
                onChange={(e) => setImagePath(e.target.value)}
                placeholder={labels.imagePathPlaceholder}
                required
                maxLength={1024}
              />
            </Field>
            <Field label={labels.alt} htmlFor="alt">
              <Input
                id="alt"
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder={labels.altPlaceholder}
                maxLength={255}
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
          </>
        ) : (
          <>
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
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label={labels.sortOrder} htmlFor="sortOrder">
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </Field>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              {labels.isActive}
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label={labels.startAt} htmlFor="startAt">
            <Input
              id="startAt"
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </Field>
          <Field label={labels.endAt} htmlFor="endAt">
            <Input
              id="endAt"
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? labels.saving : labels.save}
          </Button>
          <Link
            href="/admin/ads"
            className="px-4 py-2 text-sm font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
          >
            {labels.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
