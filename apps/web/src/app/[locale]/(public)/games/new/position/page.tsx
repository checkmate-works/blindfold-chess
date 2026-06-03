import { createNewGamePage } from '../_lib/create-new-game-page';
import { PositionGameForm } from './_components/PositionGameForm';

const { generateStaticParams, dynamic, generateMetadata, Page } = createNewGamePage({
  titleKey: 'newGame.positionPageTitle',
  path: 'games/new/position',
  buildHelpSteps: (tNewGame) => [
    {
      targetId: 'position-editor',
      title: tNewGame('positionPageTitle'),
      description: tNewGame('helpPositionIntroDescription'),
      side: 'bottom',
      align: 'center',
    },
    {
      targetId: 'engine-selector',
      title: tNewGame('selectEngine'),
      description: tNewGame('helpEngineDescription'),
      side: 'bottom',
      align: 'center',
    },
    {
      targetId: 'skill-level-selector',
      title: tNewGame('selectLevel'),
      description: tNewGame('helpSkillLevelDescription'),
      side: 'top',
      align: 'center',
    },
  ],
  renderForm: ({ locale, maiaAccess }) => (
    <PositionGameForm locale={locale} maiaAccess={maiaAccess} />
  ),
});

export { generateStaticParams, dynamic, generateMetadata };
export default Page;
