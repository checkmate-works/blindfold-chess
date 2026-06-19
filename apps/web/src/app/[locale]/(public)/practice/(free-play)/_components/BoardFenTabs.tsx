'use client';

type BoardFenTab = 'board' | 'fen';

type Props = {
  activeTab: BoardFenTab;
  onTabChange: (tab: BoardFenTab) => void;
  boardLabel: string;
  fenLabel: string;
};

/**
 * Board / FEN input tab switcher shared by the position-based UGC editors
 * (puzzle, position-memory, chunk form fields). The markup is identical
 * across all three; only the i18n labels differ, so they ride in as props.
 */
export function BoardFenTabs({ activeTab, onTabChange, boardLabel, fenLabel }: Props) {
  return (
    <nav className="flex rounded-lg bg-secondary p-1" role="tablist">
      {(['board', 'fen'] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => onTabChange(tab)}
          className={`flex-1 rounded-md px-4 py-2 text-center text-sm font-medium transition-colors ${
            activeTab === tab
              ? 'bg-card text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab === 'board' ? boardLabel : fenLabel}
        </button>
      ))}
    </nav>
  );
}
