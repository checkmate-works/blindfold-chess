import { Divider } from '@/app/[locale]/_components';
import { Skeleton } from '@/app/[locale]/_components/Skeleton';

/**
 * Label + control pair, mirroring `FormField` / a bare `<label> + control`.
 * Heights are measured from the live page: profile inputs render at 50px
 * (`px-4 py-3`), the change-password inputs at 38px (`px-3 py-2`).
 */
function FieldSkeleton({
  labelW = 'w-24',
  control = 'h-[50px]',
  hint = false,
}: {
  labelW?: string;
  control?: string;
  hint?: boolean;
}) {
  return (
    <div>
      <Skeleton className={`mb-1 h-5 ${labelW} rounded-md`} />
      <Skeleton className={`w-full rounded-lg ${control}`} />
      {hint && <Skeleton className="mt-2 h-3 w-28 rounded-md" />}
    </div>
  );
}

/** Section heading (`<h2 class="text-lg font-semibold">`, ~28px tall). */
function HeadingSkeleton({ w }: { w: string }) {
  return <Skeleton className={`h-7 ${w} rounded-md`} />;
}

/**
 * Loading placeholder for `/mypage/profile`, matched to the live layout:
 * the "view public profile" pill, the centered avatar + upload caption, the
 * three titled form sections (identity / chess / social), the save button,
 * then the change-password section and the delete-account link below the form.
 */
export function ProfileSkeleton() {
  return (
    <>
      {/* "View public profile" pill */}
      <div className="mb-4">
        <Skeleton className="h-[31px] w-64 rounded-full" />
      </div>

      {/* Profile form (space-y-8 between avatar / sections / save button) */}
      <div className="space-y-8">
        {/* Avatar + upload caption, centered */}
        <div className="flex justify-center">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-4 w-44 rounded-md" />
          </div>
        </div>

        {/* Identity: display name (+hint), bio (textarea), country, flair */}
        <section className="space-y-4">
          <HeadingSkeleton w="w-24" />
          <FieldSkeleton labelW="w-20" hint />
          <FieldSkeleton labelW="w-24" control="h-[148px]" />
          <FieldSkeleton labelW="w-8" />
          <FieldSkeleton labelW="w-12" />
        </section>

        {/* Chess accounts: FIDE ID, Chess.com, Lichess */}
        <section className="space-y-4">
          <HeadingSkeleton w="w-44" />
          <FieldSkeleton labelW="w-16" />
          <FieldSkeleton labelW="w-36" />
          <FieldSkeleton labelW="w-32" />
        </section>

        {/* Social accounts: X, Instagram, YouTube */}
        <section className="space-y-4">
          <HeadingSkeleton w="w-32" />
          <FieldSkeleton labelW="w-6" />
          <FieldSkeleton labelW="w-20" />
          <FieldSkeleton labelW="w-20" />
        </section>

        {/* Save button (full width, ~48px) */}
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      {/* Change-password section (shown for email-provider accounts) */}
      <Divider />
      <section className="space-y-4">
        <HeadingSkeleton w="w-32" />
        <FieldSkeleton labelW="w-32" control="h-[38px]" />
        <FieldSkeleton labelW="w-32" control="h-[38px]" />
        <FieldSkeleton labelW="w-40" control="h-[38px]" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </section>

      {/* Delete-account link */}
      <Divider />
      <Skeleton className="h-5 w-12 rounded-md" />
    </>
  );
}
