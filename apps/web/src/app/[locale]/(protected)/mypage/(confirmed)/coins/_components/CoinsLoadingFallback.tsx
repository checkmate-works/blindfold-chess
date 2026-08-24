import { PagePanel, PageTitle, SectionTitle, Skeleton } from '@/app/[locale]/_components';

/**
 * `MypagePoints.title` / `MypagePoints.sectionTitle` per locale, duplicated
 * here on purpose: this fallback renders before `getTranslations` is
 * reachable, so it cannot look the strings up from the message catalog —
 * same tradeoff as `TITLE_BY_LOCALE` in `NotificationsLoadingFallback`.
 * The sync with `MypagePoints` in `src/messages/*.json` is enforced by the
 * test next to this file, which is why the map is exported.
 */
export const TEXT_BY_LOCALE: Record<string, { title: string; section: string }> = {
  en: { title: 'Coins', section: 'Your coins' },
  ja: { title: 'コイン', section: 'コイン残高' },
  es: { title: 'Monedas', section: 'Tus monedas' },
  'pt-BR': { title: 'Moedas', section: 'Suas moedas' },
};

/**
 * Skeleton of one spend-option card (`SpendOptionCard`): 40×40 icon badge
 * beside a title + rate column, a note line, and the full-width CTA button.
 */
function SpendOptionCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-4 w-3/4 rounded-md" />
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  );
}

type Props = {
  locale: string;
};

/**
 * Full loading shell for `/mypage/coins`, mirroring the page's real order:
 * balance card, two spend-option cards, the ad_free redeem card, then the
 * history table. Selected by `resolveLoadingFallback`
 * (`(protected)/_lib/resolveLoadingFallback.tsx`) for both the `(protected)`
 * layout's auth-gate `<Suspense>` and `(protected)/loading.tsx` — this route
 * deliberately has no folder-scoped `loading.tsx` of its own (see that
 * resolver's doc for why).
 *
 * The page title and section heading render for real: they depend only on
 * `locale`, already known from the pathname, so hiding them behind pulse
 * bars would blank text that never waits on data. Every card reuses the
 * real card's container classes (`rounded-xl border … p-4/p-6`), so only
 * inner content swaps when the data arrives — the boxes themselves do not
 * move. That the section holds one stable shape for every user is exactly
 * what the always-rendered redeem card was built to guarantee (see
 * `RedeemNoticeOverlay`'s design note).
 */
export function CoinsLoadingFallback({ locale }: Props) {
  const text = TEXT_BY_LOCALE[locale] ?? TEXT_BY_LOCALE.en;

  return (
    <div className="space-y-8">
      <PageTitle>{text.title}</PageTitle>
      <PagePanel>
        <SectionTitle>{text.section}</SectionTitle>

        <div className="space-y-6">
          {/* Balance card: coin icon + total + about-link line */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-9 w-16 rounded-md" />
            </div>
            <Skeleton className="mt-3 h-4 w-40 rounded-md" />
          </div>

          {/* Spend-option cards: AI review, Maia */}
          <SpendOptionCardSkeleton />
          <SpendOptionCardSkeleton />

          {/* Redeem card: title, description, amount row, submit */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24 rounded-md" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
            <Skeleton className="h-9 w-full rounded-md" />
          </div>

          {/* History: heading + table box with header and rows */}
          <div>
            <Skeleton className="h-4 w-16 rounded-md mb-2" />
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-4 py-2">
                <Skeleton className="h-3 w-2/3 rounded-md" />
              </div>
              <div className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <Skeleton className="h-4 w-20 rounded-md" />
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="h-4 w-8 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PagePanel>
    </div>
  );
}
