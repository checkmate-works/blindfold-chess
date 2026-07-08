'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';

import Image from 'next/image';

import { Field, Input, Textarea } from '@/app/admin/_components/forms';

import type { NativeCardPayload, NativeCardThumbnail } from '@/lib/ads/payload';
import { DEFAULT_NATIVE_THUMBNAIL_FEN, resolveNativeThumbnail } from '@/lib/ads/payload';
import type { AdSlot } from '@/lib/ads/registry';
import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import type { AdCreativeFormLabels } from '../_lib/form-labels';
import { useCommonCreativeState } from '../_lib/use-common-creative-state';
import type { CommonCreativeInitial } from '../_lib/use-common-creative-state';
import { useCreativeSubmit } from '../_lib/use-creative-submit';
import { CreativeFormShell } from './CreativeFormShell';
import { NativeCardPreview } from './NativeCardPreview';

export type NativeCardFormInitial = CommonCreativeInitial & {
  payload: Partial<NativeCardPayload>;
};

type Props = {
  mode: 'create' | 'edit';
  slot: AdSlot;
  creativeId?: string;
  initial: NativeCardFormInitial;
  labels: AdCreativeFormLabels;
};

/** Create/edit form for native-card creatives (thumbnail + avatar + copy). */
export function NativeCardCreativeForm({ mode, slot, creativeId, initial, labels }: Props) {
  const common = useCommonCreativeState(initial);
  const { submit, isPending, error, setError } = useCreativeSubmit(slot);

  const [avatarImagePath, setAvatarImagePath] = useState<string | null>(
    initial.payload.avatarImagePath ?? null
  );
  const [avatarAlt, setAvatarAlt] = useState(initial.payload.avatarAlt ?? 'Advertisement');
  const [title, setTitle] = useState(initial.payload.title ?? '');
  const [description, setDescription] = useState(initial.payload.description ?? '');
  const [isUploading, setIsUploading] = useState(false);

  // Normalize (also recovers legacy `{type:'image'}` thumbnails still in the DB).
  const initThumb = resolveNativeThumbnail(initial.payload as NativeCardPayload);
  const [thumbnailFen, setThumbnailFen] = useState(initThumb.fen);
  const [thumbnailImagePath, setThumbnailImagePath] = useState<string | null>(
    initThumb.imagePath ?? null
  );
  const [thumbnailAlt, setThumbnailAlt] = useState(initThumb.imageAlt || 'Advertisement');
  const [isThumbUploading, setIsThumbUploading] = useState(false);

  const uploadImage = async (file: File, target: 'avatar' | 'thumbnail') => {
    if (!creativeId) return null;
    setError(null);
    const body = new FormData();
    body.append('file', file);
    body.append('target', target);
    const res = await fetch(`/api/admin/ads/${creativeId}/image`, { method: 'POST', body });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? 'upload_failed');
      return null;
    }
    const data = (await res.json()) as { imagePath: string };
    return data.imagePath;
  };

  const handleAvatarUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const path = await uploadImage(file, 'avatar');
      if (path) setAvatarImagePath(path);
    } finally {
      setIsUploading(false);
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    setIsThumbUploading(true);
    try {
      const path = await uploadImage(file, 'thumbnail');
      if (path) setThumbnailImagePath(path);
    } finally {
      setIsThumbUploading(false);
    }
  };

  const removeThumbnailImage = async () => {
    // No saved creative yet → the image only lives in local state.
    if (!creativeId) {
      setThumbnailImagePath(null);
      return;
    }
    setError(null);
    setIsThumbUploading(true);
    try {
      const res = await fetch(`/api/admin/ads/${creativeId}/image?target=thumbnail`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'delete_failed');
        return;
      }
      setThumbnailImagePath(null);
    } finally {
      setIsThumbUploading(false);
    }
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
    submit(mode, creativeId, common.toFields(), {
      avatarImagePath,
      avatarAlt,
      title,
      description,
      thumbnail: currentThumbnail,
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
        <div>
          <span className="block text-sm font-medium mb-1">{labels.thumbnail}</span>
          <div className="space-y-4">
            {/* Board (FEN) — always present; the fallback when no image is set. */}
            <div className="flex items-start gap-3">
              <div className="w-24 h-24 shrink-0 overflow-hidden rounded border border-border">
                <BoardThumbnail
                  fen={thumbnailFen.trim() || DEFAULT_NATIVE_THUMBNAIL_FEN}
                  className="w-full h-full"
                />
              </div>
              <div className="flex-1">
                <Input
                  id="thumbnailFen"
                  type="text"
                  value={thumbnailFen}
                  onChange={(e) => setThumbnailFen(e.target.value)}
                  placeholder={labels.thumbnailFenPlaceholder}
                  maxLength={100}
                />
                <p className="mt-1 text-xs text-muted-foreground">{labels.thumbnailFen}</p>
              </div>
            </div>

            {/* Optional override image — wins over the board when present. */}
            <div>
              <span className="block text-sm font-medium mb-1">
                {labels.thumbnailImageOverride}
              </span>
              <div className="flex items-center gap-3">
                {thumbnailImagePath ? (
                  <Image
                    src={thumbnailImagePath}
                    alt={thumbnailAlt}
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded border border-border object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-24 h-24 rounded border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    —
                  </div>
                )}
                {mode === 'edit' ? (
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer px-3 py-1.5 text-sm rounded border border-border hover:bg-secondary transition-colors text-center">
                      {isThumbUploading
                        ? labels.thumbnailImageUploading
                        : labels.thumbnailImageUpload}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={isThumbUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleThumbnailUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {thumbnailImagePath && (
                      <button
                        type="button"
                        onClick={removeThumbnailImage}
                        disabled={isThumbUploading}
                        className="px-3 py-1.5 text-sm rounded border border-border text-destructive-soft-foreground hover:bg-destructive-soft transition-colors disabled:opacity-50"
                      >
                        {labels.thumbnailImageRemove}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{labels.thumbnailImageHintCreate}</p>
                )}
              </div>
              {thumbnailImagePath && (
                <div className="mt-2">
                  <Field label={labels.thumbnailAlt} htmlFor="thumbnailAlt">
                    <Input
                      id="thumbnailAlt"
                      type="text"
                      value={thumbnailAlt}
                      onChange={(e) => setThumbnailAlt(e.target.value)}
                      maxLength={255}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
        </div>

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

        <Field label={labels.title} htmlFor="title" description={labels.cardCopyHint}>
          <Input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={2000}
          />
        </Field>
        <Field label={labels.description} htmlFor="description">
          <Textarea
            id="description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </Field>
      </CreativeFormShell>

      <aside className="lg:sticky lg:top-4">
        <NativeCardPreview
          avatarImagePath={avatarImagePath}
          avatarAlt={avatarAlt}
          title={title}
          description={description}
          thumbnail={currentThumbnail}
          label={labels.preview}
          caption={labels.previewCaption}
        />
      </aside>
    </div>
  );
}
