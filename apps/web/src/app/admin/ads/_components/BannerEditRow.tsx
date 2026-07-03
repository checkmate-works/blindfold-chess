'use client';

import { useState, useTransition } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { AdminBadge } from '@/app/admin/_components/AdminBadge';

import type { AdBannerRecord } from '@/lib/db';

import { updateAdBanner } from '../_actions/updateAdBanner';

type BannerEditRowProps = {
  banner: AdBannerRecord;
  labels: {
    edit: string;
    save: string;
    cancel: string;
    saving: string;
    active: string;
    inactive: string;
  };
};

export function BannerEditRow({ banner, labels }: BannerEditRowProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [href, setHref] = useState(banner.href);
  const [imagePath, setImagePath] = useState(banner.imagePath);
  const [alt, setAlt] = useState(banner.alt);
  const [isActive, setIsActive] = useState(banner.isActive);

  const handleSave = () => {
    startTransition(async () => {
      await updateAdBanner(banner.id, { href, imagePath, alt, isActive });
      setIsEditing(false);
      router.refresh();
    });
  };

  const handleCancel = () => {
    setHref(banner.href);
    setImagePath(banner.imagePath);
    setAlt(banner.alt);
    setIsActive(banner.isActive);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <tr className="border-t border-border">
        <td className="px-4 py-3 text-sm">{banner.slot}</td>
        <td className="px-4 py-3">
          <input
            type="text"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-border rounded bg-card text-foreground"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="text"
            value={imagePath}
            onChange={(e) => setImagePath(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-border rounded bg-card text-foreground"
          />
        </td>
        <td className="px-4 py-3">
          <Image
            src={imagePath}
            alt={alt}
            width={80}
            height={80}
            className="rounded object-cover"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-border rounded bg-card text-foreground"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-3 py-1 text-xs font-medium rounded bg-primary text-primary-foreground hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {isPending ? labels.saving : labels.save}
            </button>
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
            >
              {labels.cancel}
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 text-sm">{banner.slot}</td>
      <td className="px-4 py-3 text-sm max-w-[200px] truncate">{banner.href}</td>
      <td className="px-4 py-3 text-sm max-w-[200px] truncate">{banner.imagePath}</td>
      <td className="px-4 py-3">
        <Image
          src={banner.imagePath}
          alt={banner.alt}
          width={80}
          height={80}
          className="rounded object-cover"
        />
      </td>
      <td className="px-4 py-3 text-sm">{banner.alt}</td>
      <td className="px-4 py-3">
        <AdminBadge variant={banner.isActive ? 'success' : 'danger'}>
          {banner.isActive ? labels.active : labels.inactive}
        </AdminBadge>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => setIsEditing(true)}
          className="px-3 py-1 text-xs font-medium rounded bg-card text-foreground hover:bg-secondary border border-border transition-colors"
        >
          {labels.edit}
        </button>
      </td>
    </tr>
  );
}
