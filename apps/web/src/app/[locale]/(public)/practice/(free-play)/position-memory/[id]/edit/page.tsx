import { getPositionById } from '@/lib/positions/queries';

import {
  POSITION_MEMORY_ROUTE,
  createPositionEditPage,
} from '@/app/[locale]/(public)/practice/(free-play)/_lib/create-position-route-pages';

import { DeletePositionButton } from '../../_components/DeletePositionButton';
import { EditPositionForm } from '../../_components/EditPositionForm';

const { generateMetadata, Page } = createPositionEditPage(POSITION_MEMORY_ROUTE, {
  loadEditData: async (id) => {
    const position = await getPositionById({ id, type: 'memory' });
    return position ? { position } : null;
  },
  renderForm: ({ data: { position }, attachedTags, availableTags }) => (
    <EditPositionForm
      positionId={position.id}
      initial={{
        fen: position.fen,
        title: position.title,
        description: position.description,
        themes: attachedTags.themes,
        chunks: attachedTags.chunks,
      }}
      available={{ themes: availableTags.themes, chunks: availableTags.chunks }}
    />
  ),
  renderDeleteButton: ({ positionId, locale }) => (
    <DeletePositionButton positionId={positionId} locale={locale} />
  ),
});

export { generateMetadata };
export default Page;
