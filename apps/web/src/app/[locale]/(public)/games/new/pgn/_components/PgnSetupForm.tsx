'use client';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { MaiaRating } from '@blindfold-chess/features/ai-game/maia';
import type { Side } from '@blindfold-chess/types';

import type { EngineKind } from '@/lib/engines';
import type { SkillLevel } from '@/lib/games/saved-game-types';

import { CollapsibleGameSettings } from '@/app/[locale]/(public)/games/new/_components/CollapsibleGameSettings';
import { ColorSelector } from '@/app/[locale]/(public)/games/new/_components/ColorSelector';
import { EngineSelector } from '@/app/[locale]/(public)/games/new/_components/EngineSelector';
import { SkillLevelSelector } from '@/app/[locale]/(public)/games/new/_components/SkillLevelSelector';
import type { useLocalGameSettings } from '@/app/[locale]/(public)/games/new/_hooks/use-local-game-settings';
import type { MaiaCardMode } from '@/app/[locale]/(public)/games/new/_lib/maia-launch';
import { PgnInput } from '@/app/[locale]/_components/PgnInput';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';

type LocalSettings = ReturnType<typeof useLocalGameSettings>['localSettings'];

type Props = {
  pgn: string;
  onPgnChange: (value: string) => void;
  color: Side;
  onColorChange: (color: Side) => void;
  skillLevel: SkillLevel;
  onSkillLevelChange: (level: SkillLevel) => void;
  maiaRating: MaiaRating;
  onMaiaRatingChange: (rating: MaiaRating) => void;
  engine: EngineKind;
  onEngineChange: (engine: EngineKind) => void;
  maiaCardMode: MaiaCardMode;
  maiaCost: number;
  onMaiaLockedClick: () => void;
  localSettings: LocalSettings;
  onSettingsChange: ReturnType<typeof useLocalGameSettings>['handleSettingsChange'];
  showDerivedFromPgnHint: boolean;
  isStartDisabled: boolean;
  isLoading: boolean;
  onStartGame: () => void;
  previewSlot?: React.ReactNode;
};

/**
 * Presentational setup form: PGN input, color/engine/skill selectors,
 * game settings, and the start button. Has no URL-reading or PGN-parsing
 * logic of its own — those live in the parent orchestrator.
 */
export function PgnSetupForm({
  pgn,
  onPgnChange,
  color,
  onColorChange,
  skillLevel,
  onSkillLevelChange,
  maiaRating,
  onMaiaRatingChange,
  engine,
  onEngineChange,
  maiaCardMode,
  maiaCost,
  onMaiaLockedClick,
  localSettings,
  onSettingsChange,
  showDerivedFromPgnHint,
  isStartDisabled,
  isLoading,
  onStartGame,
  previewSlot,
}: Props) {
  const t = useTranslations('newGame');

  return (
    <div className="space-y-4">
      <div data-tour-id="pgn-input">
        <SectionTitle>{t('pgnTitle')}</SectionTitle>
        <PgnInput value={pgn} onChange={onPgnChange} />
      </div>
      {previewSlot}

      {/* ColorSelector provides its own SectionTitle */}
      <ColorSelector value={color} onChange={onColorChange} />
      {showDerivedFromPgnHint && (
        <p className="text-sm text-muted-foreground">{t('derivedFromPgn')}</p>
      )}

      <EngineSelector
        value={engine}
        onChange={onEngineChange}
        maiaCardMode={maiaCardMode}
        maiaCost={maiaCost}
        onMaiaLockedClick={onMaiaLockedClick}
      />
      <SkillLevelSelector
        engine={engine}
        stockfishLevel={skillLevel}
        onStockfishLevelChange={onSkillLevelChange}
        maiaRating={maiaRating}
        onMaiaRatingChange={onMaiaRatingChange}
      />

      <SectionTitle>{t('gameSettings')}</SectionTitle>
      <CollapsibleGameSettings settings={localSettings} onSettingsChange={onSettingsChange} />

      <Button
        onClick={onStartGame}
        disabled={isStartDisabled}
        loading={isLoading}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {t('startGame')}
      </Button>
    </div>
  );
}
