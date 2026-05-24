import Link from 'next/link';

import { FiGitPullRequest } from 'react-icons/fi';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Viewer relationship to the edit-suggestion flow, used to switch the
 * callout CTA copy. Decoupled from the actual permission checks
 * (which live on the server actions) — the prop only drives copy and
 * visual emphasis.
 *
 * - `owner`: chunk author. CTA reads "View suggestions" — they review
 *   the queue rather than submit to it.
 * - `hasPending`: signed-in non-owner with an existing pending row.
 *   CTA reads "View / manage your suggestion" — the dedicated page
 *   surfaces their existing row + Withdraw button.
 * - `canSuggest`: signed-in non-owner without a pending row. CTA
 *   reads "Suggest an edit". Past resolved rows do not change this
 *   state (the visitor is free to suggest again).
 * - `signedOut`: anonymous viewer. CTA reads "Sign in to suggest" —
 *   following the link still lands on the edit-requests page, which
 *   itself surfaces the sign-in prompt.
 */
export type EditRequestCalloutViewerState = 'owner' | 'hasPending' | 'canSuggest' | 'signedOut';

type Props = {
  locale: Locale;
  slug: string;
  pendingCount: number;
  /**
   * Generic body shown when the author has not flagged any specific
   * field for feedback. Hidden once `requestedTopicLabels` is non-empty
   * because the more specific copy renders instead.
   */
  body: string;
  /**
   * CTA labels keyed by viewer state. The page resolves the four
   * strings from i18n at the call site so the callout itself stays
   * server / client agnostic.
   */
  ctaByState: Record<EditRequestCalloutViewerState, string>;
  viewerState: EditRequestCalloutViewerState;
  /**
   * Pre-localized labels for the fields the author wants targeted
   * feedback on (e.g. ["タイトル", "説明"]). When non-empty, the
   * callout swaps the generic body for a list that names them
   * explicitly so visitors can write the most useful suggestion. When
   * empty / undefined, the generic body renders.
   */
  requestedTopicLabels?: readonly string[];
  /**
   * Localized lead-in to the topic list (e.g. "The author is looking
   * for input on:"). Ignored when `requestedTopicLabels` is empty.
   */
  topicLeadIn?: string;
};

/**
 * Draft-only callout placed under the Description section. Surfaces the
 * edit-suggestion workflow as a Qiita-style banner so visitors notice the
 * collaborative entry point without it competing for space with the
 * owner-only action row (Edit / Publish / Delete) at the bottom of the
 * page.
 *
 * Amber palette mirrors the Draft badge in the page title so the page's
 * "this is a workshop state" visual language stays consistent (same tone
 * as the not-translated notice on `articles/[slug]`).
 *
 * `data-tour-id="chunk-edit-requests-link"` is kept on the CTA so the
 * existing HelpTourButton step continues to highlight the right element.
 */
export function EditRequestCallout({
  locale,
  slug,
  pendingCount,
  body,
  ctaByState,
  viewerState,
  requestedTopicLabels,
  topicLeadIn,
}: Props) {
  const hasRequestedTopics = !!requestedTopicLabels && requestedTopicLabels.length > 0;
  const cta = ctaByState[viewerState];

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      {hasRequestedTopics ? (
        <div className="space-y-1">
          {topicLeadIn && <p>{topicLeadIn}</p>}
          <ul className="flex flex-wrap gap-1.5">
            {requestedTopicLabels!.map((label) => (
              <li
                key={label}
                className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-800 dark:text-amber-100"
              >
                {label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>{body}</p>
      )}
      <div className="mt-2">
        <Link
          href={`/${locale}/chunks/${slug}/edit-requests`}
          data-tour-id="chunk-edit-requests-link"
          className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-amber-900 hover:border-amber-400 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:border-amber-600 dark:hover:bg-amber-900/60 transition-colors"
        >
          <FiGitPullRequest className="h-3 w-3" aria-hidden />
          {cta}
          {pendingCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-800 dark:text-amber-100">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
