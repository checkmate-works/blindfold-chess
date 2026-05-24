import Link from 'next/link';

import { FiGitPullRequest } from 'react-icons/fi';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  slug: string;
  pendingCount: number;
  body: string;
  cta: string;
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
export function EditRequestCallout({ locale, slug, pendingCount, body, cta }: Props) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
      <p>{body}</p>
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
