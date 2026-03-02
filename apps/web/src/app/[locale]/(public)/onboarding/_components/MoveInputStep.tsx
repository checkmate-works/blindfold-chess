'use client';

import { useTranslations } from 'next-intl';

import { ChessPieceIcon } from '@blindfold-chess/icons';
import { FaChevronDown, FaKeyboard, FaList, FaThLarge } from 'react-icons/fa';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type MoveInputMode = GamePreferences['moveInputMode'];

type Props = {
  selectedModes: MoveInputMode[];
  onToggleMode: (mode: MoveInputMode) => void;
};

const INPUT_MODE_OPTIONS: { mode: MoveInputMode; iconElement: React.ReactNode }[] = [
  { mode: 'text', iconElement: <FaKeyboard /> },
  { mode: 'select', iconElement: <FaList /> },
  { mode: 'button', iconElement: <FaThLarge /> },
];

const PIECE_TYPES = ['k', 'q', 'r', 'b', 'n'] as const;

/** Static preview of the text input mode (MoveInput) */
function TextInputPreview({ placeholder }: { placeholder: string }) {
  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <div className="w-full px-4 py-2.5 border border-border rounded-lg bg-background font-mono text-sm text-muted-foreground">
          {placeholder}
        </div>
      </div>
    </div>
  );
}

/** Static preview of the select input mode (MoveSelect) */
function SelectInputPreview({ placeholder }: { placeholder: string }) {
  return (
    <div className="relative flex-1">
      <div className="w-full flex items-center justify-between px-4 py-2.5 border rounded-lg bg-background text-sm text-left border-border">
        <span className="text-muted-foreground">{placeholder}</span>
        <FaChevronDown className="w-3 h-3 ml-2 text-muted-foreground" />
      </div>
    </div>
  );
}

/** Static preview of the button input mode (ButtonInput) */
function ButtonInputPreview() {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  return (
    <div className="flex flex-col gap-2">
      {/* Piece row */}
      <div className="flex gap-1.5 justify-center">
        {PIECE_TYPES.map((pieceType) => (
          <div
            key={pieceType}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-background border border-border"
          >
            <ChessPieceIcon type={pieceType} color="w" size={20} />
          </div>
        ))}
      </div>
      {/* File row */}
      <div className="flex gap-1 justify-center w-full">
        {files.map((file) => (
          <div
            key={file}
            className="flex-1 min-w-0 h-7 flex items-center justify-center rounded-md font-mono text-xs bg-background border border-border text-foreground"
          >
            {file}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModePreview({ mode, t }: { mode: MoveInputMode; t: (key: string) => string }) {
  switch (mode) {
    case 'text':
      return <TextInputPreview placeholder={t('step1.preview.textPlaceholder')} />;
    case 'select':
      return <SelectInputPreview placeholder={t('step1.preview.selectPlaceholder')} />;
    case 'button':
      return <ButtonInputPreview />;
  }
}

export function MoveInputStep({ selectedModes, onToggleMode }: Props) {
  const t = useTranslations('onboarding');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold text-foreground">{t('step1.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('step1.description')}</p>
      </div>

      <div className="space-y-3">
        {INPUT_MODE_OPTIONS.map(({ mode, iconElement }) => {
          const isSelected = selectedModes.includes(mode);

          return (
            <button
              key={mode}
              type="button"
              onClick={() => onToggleMode(mode)}
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
                    {t(`step1.modes.${mode}.label`)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(`step1.modes.${mode}.description`)}
                  </p>
                </div>
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-sm border-2 transition-colors ${
                    isSelected ? 'border-primary bg-primary' : 'border-border'
                  }`}
                >
                  {isSelected && (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              {isSelected && (
                <div className="px-4 pb-4 pt-0 pointer-events-none">
                  <div className="border-t border-border/50 pt-3">
                    <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">
                      {t('step1.preview.label')}
                    </p>
                    <ModePreview mode={mode} t={t} />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{t('step1.hint.multiSelect')}</p>
        <p className="text-xs text-muted-foreground">{t('step1.hint.changeLater')}</p>
      </div>
    </div>
  );
}
