import { PracticeResultLoadingSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultLoadingSkeleton';

// Challenge runs award EXP (authenticated). Quadrants disables the sign-up
// banner (showSignUpBanner: false in its ResultClient), so only EXP is reserved.
export default function Loading() {
  return <PracticeResultLoadingSkeleton grantsExp />;
}
