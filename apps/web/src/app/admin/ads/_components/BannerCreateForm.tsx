'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Button, Field, Input } from '@/app/admin/_components/forms';

import { createAdBanner } from '../_actions/createAdBanner';

type BannerCreateFormProps = {
  labels: {
    formTitle: string;
    slot: string;
    slotPlaceholder: string;
    href: string;
    hrefPlaceholder: string;
    imagePath: string;
    imagePathPlaceholder: string;
    alt: string;
    altPlaceholder: string;
    width: string;
    height: string;
    isActive: string;
    sortOrder: string;
    startAt: string;
    endAt: string;
    create: string;
    creating: string;
    cancel: string;
  };
};

export function BannerCreateForm({ labels }: BannerCreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slot, setSlot] = useState('');
  const [href, setHref] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [alt, setAlt] = useState('Advertisement');
  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(100);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createAdBanner({
        slot,
        href,
        imagePath,
        alt,
        width,
        height,
        isActive,
        sortOrder,
        startAt: startAt || null,
        endAt: endAt || null,
      });

      if ('error' in result) {
        setError(result.error);
      } else {
        router.push('/admin/ads');
      }
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{labels.formTitle}</h1>

      {error && (
        <div className="mb-4 p-3 rounded bg-destructive-soft text-destructive-soft-foreground text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <Field label={labels.slot} htmlFor="slot">
          <Input
            id="slot"
            type="text"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            placeholder={labels.slotPlaceholder}
            required
            maxLength={50}
          />
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

        <Field label={labels.sortOrder} htmlFor="sortOrder">
          <Input
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </Field>

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

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="isActive" className="text-sm font-medium">
            {labels.isActive}
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? labels.creating : labels.create}
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
