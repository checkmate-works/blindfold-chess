import { getTranslations } from 'next-intl/server';

import { getLocaleFromPathnameHeader } from '@/i18n/get-locale-from-pathname-header';

import { getOptionalUser } from '@/lib/auth';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { BreadcrumbSkeleton } from '@/app/[locale]/_components/Breadcrumb';

import { PracticeResultPanelSkeleton } from './PracticeResultPanelSkeleton';

type Props = {
  /** Whether this module awards EXP (reserve the card for authenticated users). */
  grantsExp?: boolean;
  /** Whether this module shows the sign-up banner (reserve it for anonymous users). */
  showsSignUpBanner?: boolean;
  /** Whether this module records to `challenge_results` (reserve the record section for authenticated users). */
  showsRecordSection?: boolean;
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
  showsRecordSection = false,
}: Props = {}) {
  const locale = await getLocaleFromPathnameHeader();
  const [tPractice, tNav] = await Promise.all([
    getTranslations({ locale, namespace: 'practice' }),
    getTranslations({ locale, namespace: 'navigation' }),
  ]);

  // Only resolve the user when a conditional block could be reserved; modules
  // that show none of them (the default) skip the auth round-trip entirely.
  let isAuthed = false;
  if (grantsExp || showsSignUpBanner || showsRecordSection) {
    const user = await getOptionalUser();
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
          reserveRecordSection={showsRecordSection && isAuthed}
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
          <BreadcrumbSkeleton
            crumbs={[
              { label: tNav('practice') },
              { widthClass: 'w-32' },
              { label: tPractice('result'), current: true },
            ]}
            density="compact"
          />
        </div>
      </PagePanel>
    </div>
  );
}
