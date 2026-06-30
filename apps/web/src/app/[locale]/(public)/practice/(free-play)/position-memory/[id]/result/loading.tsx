import { SinglePositionResultLoadingSkeleton } from '../../_components/single-position/SinglePositionResultLoadingSkeleton';

// DB-backed single positions earn EXP — reserve the EXP card for authenticated
// users (the bespoke skeleton handles the anonymous sign-up banner itself).
export default function Loading() {
  return <SinglePositionResultLoadingSkeleton grantsExp />;
}
