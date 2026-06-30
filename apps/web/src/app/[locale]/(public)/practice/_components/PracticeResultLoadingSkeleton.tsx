import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';

import { PracticeResultPanelSkeleton } from './PracticeResultPanelSkeleton';

type Props = {
  /** Whether this module awards EXP (reserve the card for authenticated users). */
  grantsExp?: boolean;
  /** Whether this module shows the sign-up banner (reserve it for anonymous users). */
  showsSignUpBanner?: boolean;
};

/**
 * Server `loading.tsx` skeleton shared by every practice result route.
 *
 * Mirrors `PracticeResultPage` (the wrapper rendered by all 11 result
 * routes via `createPracticeResultClient`):
 *
 *   <div className="space-y-8">
 *     <PageTitle>{title}</PageTitle>
 *     <PagePanel>
 *       <PracticeComplete .../>           // heading + accuracy bar + action buttons + related cards
 *       [<LeaderboardPreview />]          // most modules
 *       [ad slots / sign-up banner]
 *       <Divider />
 *       <Breadcrumb />
 *     </PagePanel>
 *   </div>
 *
 * The page title and intermediate breadcrumb items vary per module and can
 * only be resolved at render time — they use bar placeholders. The first and
 * last breadcrumb items (`navigation.practice`, `practice.result`) are
 * static and render real translated strings. The PagePanel-inner content is
 * the shared `PracticeResultPanelSkeleton`, which the inline
 * `PracticeResultSkeleton` also renders, so the session
 * -> result-route-loading -> result sequence keeps one stable panel shape.
 * (See that component for why LeaderboardPreview / related-module card are
 * always reserved.)
 */
export async function PracticeResultLoadingSkeleton({
  grantsExp = false,
  showsSignUpBanner = false,
}: Props = {}) {
  const [tPractice, tNav] = await Promise.all([
    getTranslations('practice'),
    getTranslations('navigation'),
  ]);

  // Only resolve the user when a conditional block could be reserved; modules
  // that show neither (the default) skip the auth round-trip entirely.
  let isAuthed = false;
  if (grantsExp || showsSignUpBanner) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthed = !!user;
  }

  return (
    <div className="space-y-8">
      <PageTitle>
        <span className="inline-block h-7 md:h-8 w-2/3 bg-muted rounded align-middle animate-pulse" />
      </PageTitle>

      <PagePanel>
        <PracticeResultPanelSkeleton
          reserveExp={grantsExp && isAuthed}
          reserveSignUpBanner={showsSignUpBanner && !isAuthed}
        />

        {/* Mirror `PageLayout`'s trailing `!mt-4 space-y-4` block (see
            PageLayout.tsx) so the divider→breadcrumb spacing matches the
            real page exactly during loading. */}
        <div className="!mt-4 space-y-4">
          <Divider />

          {/* Breadcrumb: [Home logo] / Practice / <module> / Result. Leading
              home-logo `<li>` mirrors `BreadcrumbContent` (Breadcrumb.tsx)
              so the logo + first separator do not pop in on hydration. The
              first and last text items are static i18n strings; the middle
              module name uses a bar placeholder. Compact density (`min-h-6`,
              no `mb-4`) matches the `PageLayout` loaded state. */}
          <nav aria-label="Breadcrumb" className="flex min-h-6 items-center">
            <ol className="flex flex-wrap items-center gap-x-1 text-sm">
              <li>
                <div className="w-6 h-6 rounded-sm bg-muted animate-pulse" />
              </li>
              <li className="flex items-center">
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-muted-foreground">{tNav('practice')}</span>
              </li>
              <li className="flex items-center">
                <span className="mx-1 text-muted-foreground">/</span>
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              </li>
              <li className="flex items-center">
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-foreground font-medium">{tPractice('result')}</span>
              </li>
            </ol>
          </nav>
        </div>
      </PagePanel>
    </div>
  );
}
