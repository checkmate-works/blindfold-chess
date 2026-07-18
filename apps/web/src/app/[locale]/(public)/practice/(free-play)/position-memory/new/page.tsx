import { loadPositionForkSeed } from '@/lib/positions/fork';

import {
  POSITION_MEMORY_ROUTE,
  createPositionCreatePage,
} from '@/app/[locale]/(public)/practice/(free-play)/_lib/create-position-route-pages';

import { CreatePositionForm } from '../_components/CreatePositionForm';

const { generateMetadata, Page } = createPositionCreatePage(POSITION_MEMORY_ROUTE, {
  loadForkSeed: loadPositionForkSeed,
  renderForm: ({ user, displayName, availableTags, forkSeed, injectedFen, injectedChunkIds }) => (
    <CreatePositionForm
      displayName={displayName}
      disableUnsavedGuard={!user}
      availableThemes={availableTags.themes}
      availableChunks={availableTags.chunks}
      forkSeed={forkSeed}
      injectedFen={injectedFen}
      injectedChunkIds={injectedChunkIds}
    />
  ),
});

export { generateMetadata };
export default Page;
