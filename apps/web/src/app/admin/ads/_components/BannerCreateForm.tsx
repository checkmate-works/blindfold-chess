'use client';

import { useState, useTransition } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

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

  const inputClassName =
    'w-full px-3 py-2 text-sm border border-border rounded bg-card text-foreground';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{labels.formTitle}</h1>

      {error && <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium mb-1">{labels.slot}</label>
          <input
            type="text"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            placeholder={labels.slotPlaceholder}
            required
            maxLength={50}
            className={inputClassName}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{labels.href}</label>
          <input
            type="text"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder={labels.hrefPlaceholder}
            required
            maxLength={2048}
            className={inputClassName}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{labels.imagePath}</label>
          <input
            type="text"
            value={imagePath}
            onChange={(e) => setImagePath(e.target.value)}
            placeholder={labels.imagePathPlaceholder}
            required
            maxLength={1024}
            className={inputClassName}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{labels.alt}</label>
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder={labels.altPlaceholder}
            maxLength={255}
            className={inputClassName}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{labels.width}</label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              required
              min={1}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{labels.height}</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              required
              min={1}
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">{labels.sortOrder}</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className={inputClassName}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{labels.startAt}</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={inputClassName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{labels.endAt}</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className={inputClassName}
            />
          </div>
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
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded bg-primary text-primary-foreground hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {isPending ? labels.creating : labels.create}
          </button>
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
