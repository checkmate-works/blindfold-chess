'use client';

import { useState, useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { Button, Input } from '@/app/admin/_components/forms';

import type { ActionResult } from '@/lib/action-types';

import { AdminBadge } from '../../_components/AdminBadge';
import { setAdCreativeActiveByTitle } from '../_actions/setAdCreativeActiveByTitle';
import { setAdCreativeHrefByTitle } from '../_actions/setAdCreativeHrefByTitle';
import type { CreativeLinkGroup } from '../_lib/link-groups';
import { AD_CREATIVE_LIMITS } from '../_lib/validation';

type Labels = {
  hrefNotSet: string;
  mixedLinks: string;
  apply: string;
  applied: string;
  slots: string;
  activeCount: string;
  activate: string;
  deactivate: string;
  activateBlocked: string;
  empty: string;
};

type Props = { groups: CreativeLinkGroup[]; labels: Labels };

/**
 * One row per group of creatives sharing an English title, each with a link
 * field that writes to every creative in the group at once, and a pair of
 * buttons that switch the whole group on or off. The field starts on the
 * group's link when all its rows already agree on one, so a row that is done
 * reads as done.
 *
 * Activate is disabled while any row is still on the placeholder — the
 * action refuses that anyway (`validateBulkActivation`), and the row says why
 * under the button rather than after a round trip.
 */
export function CreativeLinkGroupList({ groups, labels }: Props) {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
        {labels.empty}
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {groups.map((group) => (
        <CreativeLinkGroupRow key={group.title} group={group} labels={labels} />
      ))}
    </ul>
  );
}

function CreativeLinkGroupRow({ group, labels }: { group: CreativeLinkGroup; labels: Labels }) {
  const router = useRouter();
  const agreed = group.placeholderCount === 0 && group.hrefs.length === 1 ? group.hrefs[0] : '';
  const [href, setHref] = useState(agreed);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult<{ updated: number }>>) => {
    setStatus(null);
    startTransition(async () => {
      const result = await action();
      if ('error' in result) {
        setStatus({ ok: false, message: result.error });
        return;
      }
      setStatus({ ok: true, message: labels.applied.replace('{count}', String(result.updated)) });
      router.refresh();
    });
  };

  const total = group.creativeIds.length;
  const canActivate = group.placeholderCount === 0 && group.activeCount < total;

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{group.title}</span>
        {group.placeholderCount > 0 && (
          <AdminBadge variant="warning">
            {labels.hrefNotSet} ({group.placeholderCount})
          </AdminBadge>
        )}
        {group.hrefs.length > 1 && <AdminBadge variant="caution">{labels.mixedLinks}</AdminBadge>}
        <span className="text-xs text-muted-foreground">
          {labels.activeCount
            .replace('{active}', String(group.activeCount))
            .replace('{total}', String(total))}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {labels.slots}: <span className="font-mono">{group.slots.join(', ')}</span>
      </p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => setAdCreativeHrefByTitle(group.title, href.trim()));
        }}
      >
        <Input
          type="text"
          value={href}
          onChange={(e) => setHref(e.target.value)}
          aria-label={group.title}
          placeholder="https://"
          required
          maxLength={AD_CREATIVE_LIMITS.href}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending || href.trim() === ''}>
          {labels.apply.replace('{count}', String(total))}
        </Button>
      </form>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={isPending || !canActivate}
          onClick={() => run(() => setAdCreativeActiveByTitle(group.title, true))}
        >
          {labels.activate.replace('{count}', String(total))}
        </Button>
        <Button
          variant="outline"
          disabled={isPending || group.activeCount === 0}
          onClick={() => run(() => setAdCreativeActiveByTitle(group.title, false))}
        >
          {labels.deactivate.replace('{count}', String(total))}
        </Button>
      </div>
      {group.placeholderCount > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">{labels.activateBlocked}</p>
      )}
      {status && (
        <p
          role={status.ok ? 'status' : 'alert'}
          className={`mt-2 text-xs ${status.ok ? 'text-muted-foreground' : 'text-destructive'}`}
        >
          {status.message}
        </p>
      )}
    </li>
  );
}
