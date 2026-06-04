import { createNewGamePage } from '../_lib/create-new-game-page';
import { StandardGameForm } from './_components/StandardGameForm';

const { generateStaticParams, dynamic, generateMetadata, Page } = createNewGamePage({
  titleKey: 'newGame.standardTitle',
  path: 'games/new/standard',
  // The tour walks the engine cards first, then the skill-level dropdown —
  // same order the form reads top-to-bottom (after Color).
  buildHelpSteps: (tNewGame) => [
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
    <StandardGameForm locale={locale} maiaAccess={maiaAccess} />
  ),
});

export { generateStaticParams, dynamic, generateMetadata };
export default Page;
