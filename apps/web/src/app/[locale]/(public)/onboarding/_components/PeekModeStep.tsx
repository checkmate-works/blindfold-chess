'use client';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaChevronDown, FaEye, FaWindowMaximize } from 'react-icons/fa';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type PeekMode = GamePreferences['peekMode'];

type Props = {
  selectedMode: PeekMode;
  onSelectMode: (mode: PeekMode) => void;
};

const PEEK_MODE_OPTIONS: { mode: PeekMode; iconElement: React.ReactNode }[] = [
  { mode: 'modal', iconElement: <FaWindowMaximize /> },
  { mode: 'inline', iconElement: <FaChevronDown /> },
];

/** Static preview of the modal peek mode */
function ModalPreview() {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Button that triggers the modal */}
      <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md bg-background text-xs text-muted-foreground">
        <FaEye className="w-3 h-3" />
        <span>Show Board</span>
      </div>
      {/* Arrow indicating the button opens the modal */}
      <div className="text-muted-foreground/50 text-xs">▼</div>
      {/* Modal dialog */}
      <div className="w-full max-w-[200px] rounded-lg border border-border bg-background">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FaEye className="w-3 h-3" />
            <span>Board</span>
          </div>
          <div className="w-4 h-4 flex items-center justify-center rounded-sm text-muted-foreground text-xs">
            &times;
          </div>
        </div>
        <div className="aspect-square bg-muted/30 m-2 rounded-sm" />
      </div>
    </div>
  );
}

/** Static preview of the inline peek mode */
function InlinePreview() {
  return (
    <div className="w-full rounded-md border border-border bg-background overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FaEye className="w-3 h-3" />
          <span>Board</span>
        </div>
        <FaChevronDown className="w-2.5 h-2.5 text-muted-foreground rotate-180" />
      </div>
      <div className="aspect-[4/3] bg-muted/30 mx-2 mb-2 rounded-sm" />
    </div>
  );
}

function PeekModePreview({ mode }: { mode: PeekMode }) {
  switch (mode) {
    case 'modal':
      return <ModalPreview />;
    case 'inline':
      return <InlinePreview />;
  }
}

export function PeekModeStep({ selectedMode, onSelectMode }: Props) {
  const t = useTranslations('onboarding');

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {PEEK_MODE_OPTIONS.map(({ mode, iconElement }) => {
          const isSelected = selectedMode === mode;

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onSelectMode(mode)}
              className={`w-full flex flex-col rounded-lg border transition-colors text-left ${
                isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent'
              }`}
            >
              <div className="flex items-center gap-4 p-4">
                <div
                  className={`flex-shrink-0 text-2xl ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {iconElement}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}
                  >
                    {t(`step2.modes.${mode}.label`)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(`step2.modes.${mode}.description`)}
                  </p>
                </div>
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-colors ${
                    isSelected ? 'border-primary' : 'border-border'
                  }`}
                >
                  {isSelected && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              </div>
              {isSelected && (
                <div className="px-4 pb-4 pt-0 pointer-events-none">
                  <div className="border-t border-border/50 pt-3">
                    <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">
                      {t('step2.preview.label')}
                    </p>
                    <PeekModePreview mode={mode} />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
