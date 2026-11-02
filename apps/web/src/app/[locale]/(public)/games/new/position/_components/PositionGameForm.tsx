'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { Button, FlipBoardButton } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { pieceColorToSide } from '@blindfold-chess/types';
import type { Side } from '@blindfold-chess/types';
import { FaChevronDown } from 'react-icons/fa';

import { engineConfigToUrlParams } from '@/lib/engines';
import { MAIA_CHARGE_PARAM } from '@/lib/games/maia-charge-param';
import { MAIA_GAME_POINT_COST } from '@/lib/points/constants';
import type { MaiaEngineAccess } from '@/lib/users/can-use-maia';

import { ColorSelector } from '@/app/[locale]/(public)/games/new/_components/ColorSelector';
import { EngineSelector } from '@/app/[locale]/(public)/games/new/_components/EngineSelector';
import { GameLaunchModals } from '@/app/[locale]/(public)/games/new/_components/GameLaunchModals';
import { PositionSettings } from '@/app/[locale]/(public)/games/new/_components/PositionSettings';
import { SkillLevelSelector } from '@/app/[locale]/(public)/games/new/_components/SkillLevelSelector';
import { useEngineSelection } from '@/app/[locale]/(public)/games/new/_hooks/use-engine-selection';
import { useLocalGameSettings } from '@/app/[locale]/(public)/games/new/_hooks/use-local-game-settings';
import { useMaiaGameLaunch } from '@/app/[locale]/(public)/games/new/_hooks/use-maia-game-launch';
import { usePositionState } from '@/app/[locale]/(public)/games/new/_hooks/use-position-state';
import { deriveMaiaCardMode } from '@/app/[locale]/(public)/games/new/_lib/maia-launch';
import { parseFenFields } from '@/app/[locale]/(public)/games/new/_lib/parse-fen-fields';
import { EditableBoardSkeleton } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableBoardSkeleton';
import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { useEditableBoardLabels } from '@/app/[locale]/(public)/practice/(free-play)/_hooks/use-editable-board-labels';
import { CollapsibleGameSettings } from '@/app/[locale]/(public)/preferences/_components/CollapsibleGameSettings';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  locale: Locale;
  maiaAccess: MaiaEngineAccess;
};

export function PositionGameForm({ locale, maiaAccess }: Props) {
  const t = useTranslations('newGame');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { preferences, isLoaded } = useGamePreferences();
  const { localSettings, handleSettingsChange } = useLocalGameSettings();
  const [color, setColor] = useState<Side>('white');
  const { engine, setEngine, skillLevel, setSkillLevel, maiaRating, setMaiaRating, engineConfig } =
    useEngineSelection();
  const [flipped, setFlipped] = useState(false);

  const {
    positionFen,
    setPositionFen,
    positionCastling,
    setPositionCastling,
    positionEnPassant,
    setPositionEnPassant,
    positionTurn,
    fullFen: fullPositionFen,
    validity: positionResult,
    castlingAvailability,
    enPassantAvailability,
    skipNextColorReset,
  } = usePositionState({ color });

  const positionValidation = useMemo((): { valid: boolean; error?: string } => {
    if (!positionResult.valid) {
      return { valid: false, error: t(positionResult.errorKey) };
    }
    if (positionResult.correctedColor && positionResult.correctedColor !== color) {
      return { valid: false, error: t('positionCheckCorrected') };
    }
    return { valid: true };
  }, [positionResult, t, color]);

  // Initialize from FEN URL parameter. Sets color/flipped (owned here, not
  // by the hook) together with the FEN parts (owned by the hook) and
  // suppresses the next color-driven en-passant reset so an en-passant
  // target carried in the URL survives the same-tick color set.
  useEffect(() => {
    const urlFen = searchParams.get('fen');
    if (!urlFen) return;

    const fields = parseFenFields(urlFen);
    if (!fields) return;
    const { placement, sideToMove, castling, enPassant } = fields;

    setPositionFen(placement);

    if (sideToMove) {
      skipNextColorReset();
      setColor(pieceColorToSide(sideToMove));
      setFlipped(sideToMove === 'b');
    }

    if (castling) {
      setPositionCastling({
        K: castling.includes('K'),
        Q: castling.includes('Q'),
        k: castling.includes('k'),
        q: castling.includes('q'),
      });
    }

    if (enPassant) {
      setPositionEnPassant(enPassant);
    }
  }, [searchParams, setPositionFen, setPositionCastling, setPositionEnPassant, skipNextColorReset]);

  const handlePositionFenChange = useCallback(
    (newFen: string) => {
      setPositionFen(newFen);
    },
    [setPositionFen]
  );

  const navigateToGame = (maiaChargeId: string | null) => {
    const params = new URLSearchParams({
      color,
      fen: fullPositionFen,
      gamePrefs: JSON.stringify(localSettings),
      ...engineConfigToUrlParams(engineConfig),
    });
    if (maiaChargeId) params.set(MAIA_CHARGE_PARAM, maiaChargeId);
    router.push(`/${locale}/games/play?${params.toString()}`);
  };

  const maiaCardMode = deriveMaiaCardMode(maiaAccess, MAIA_GAME_POINT_COST);
  const launch = useMaiaGameLaunch({ navigateToGame, maiaCardMode });

  const editableBoardLabels = useEditableBoardLabels('newGame.positionSettings');

  const [positionSettingsOpen, setPositionSettingsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div data-tour-id="position-editor">
        <SectionTitle>{t('customPosition')}</SectionTitle>
        <div className="flex justify-end mt-3 mb-2">
          <FlipBoardButton onClick={() => setFlipped((prev) => !prev)} title={t('flipBoard')} />
        </div>
        {!isLoaded ? (
          <EditableBoardSkeleton />
        ) : (
          <EditableChessBoard
            fen={positionFen}
            onFenChange={handlePositionFenChange}
            labels={editableBoardLabels}
            editable
            flipped={flipped}
            boardTheme={preferences.boardTheme}
            showCoordinates={preferences.showCoordinates}
          />
        )}
      </div>

      {/* Position Settings Accordion */}
      <div className="rounded-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setPositionSettingsOpen((prev) => !prev)}
          className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset"
          aria-expanded={positionSettingsOpen}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {t('positionSettings.title')}
            </span>
            <FaChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                positionSettingsOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-in-out"
          style={{
            gridTemplateRows: positionSettingsOpen ? '1fr' : '0fr',
          }}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-4 pt-2">
              <PositionSettings
                turn={positionTurn}
                castling={positionCastling}
                castlingAvailability={castlingAvailability}
                onCastlingChange={setPositionCastling}
                enPassant={positionEnPassant}
                enPassantAvailability={enPassantAvailability}
                onEnPassantChange={setPositionEnPassant}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Color Selection — ColorSelector provides its own SectionTitle */}
      <ColorSelector value={color} onChange={setColor} />

      {/* Validation message */}
      {positionValidation.error && (
        <p className="text-sm text-destructive">{positionValidation.error}</p>
      )}
      {positionValidation.valid && <p className="text-sm text-success">{t('positionValid')}</p>}

      {/* Engine + Skill Level Selection */}
      <EngineSelector
        value={engine}
        onChange={setEngine}
        maiaCardMode={maiaCardMode}
        maiaCost={MAIA_GAME_POINT_COST}
        onMaiaLockedClick={launch.openPointInfo}
      />
      <SkillLevelSelector
        engine={engine}
        stockfishLevel={skillLevel}
        onStockfishLevelChange={setSkillLevel}
        maiaRating={maiaRating}
        onMaiaRatingChange={setMaiaRating}
      />

      <SectionTitle>{t('settings')}</SectionTitle>
      <CollapsibleGameSettings settings={localSettings} onSettingsChange={handleSettingsChange} />

      <Button
        onClick={() => launch.start(engine)}
        disabled={!positionValidation.valid}
        loading={launch.isLoading}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {t('startGame')}
      </Button>

      <GameLaunchModals launch={launch} maiaAccess={maiaAccess} locale={locale} />
    </div>
  );
}
