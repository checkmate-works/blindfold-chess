'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { BoardSkeleton, Button, FlipBoardButton } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';
import { FaChevronDown } from 'react-icons/fa';

import { DEFAULT_ENGINE, type EngineKind } from '@/lib/engines';
import { shouldWarnBeforeLargeDownload } from '@/lib/network/connection';
import type { SkillLevel } from '@/lib/types';

import { CollapsibleGameSettings } from '@/app/[locale]/(public)/games/new/_components/CollapsibleGameSettings';
import { ColorSelector } from '@/app/[locale]/(public)/games/new/_components/ColorSelector';
import { EngineSelector } from '@/app/[locale]/(public)/games/new/_components/EngineSelector';
import { LargeDownloadConsentDialog } from '@/app/[locale]/(public)/games/new/_components/LargeDownloadConsentDialog';
import {
  type CastlingRights,
  PositionSettings,
} from '@/app/[locale]/(public)/games/new/_components/PositionSettings';
import { SkillLevelSelector } from '@/app/[locale]/(public)/games/new/_components/SkillLevelSelector';
import { useLocalGameSettings } from '@/app/[locale]/(public)/games/new/_hooks/use-local-game-settings';
import { buildFenFromParts } from '@/app/[locale]/(public)/games/new/_lib/build-fen-from-parts';
import { getCastlingAvailability } from '@/app/[locale]/(public)/games/new/_lib/get-castling-availability';
import { getEnPassantAvailability } from '@/app/[locale]/(public)/games/new/_lib/get-en-passant-availability';
import { validatePosition } from '@/app/[locale]/(public)/games/new/_lib/validate-position';
import { EditableChessBoard } from '@/app/[locale]/(public)/practice/(free-play)/_components/EditableChessBoard';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';
const MAIA_MODEL_SIZE_LABEL = '46 MB';

type Props = {
  locale: Locale;
  maiaUnlocked: boolean;
};

export function PositionGameForm({ locale, maiaUnlocked }: Props) {
  const t = useTranslations('newGame');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { preferences, isLoaded } = useGamePreferences();
  const { localSettings, handleSettingsChange } = useLocalGameSettings();
  const [color, setColor] = useState<Side>('white');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);
  const [engine, setEngine] = useState<EngineKind>(DEFAULT_ENGINE);
  const [isLoading, setIsLoading] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = useState(false);

  // Custom position state
  const [positionFen, setPositionFen] = useState(EMPTY_BOARD_FEN);
  const [positionCastling, setPositionCastling] = useState<CastlingRights>({
    K: false,
    Q: false,
    k: false,
    q: false,
  });
  const [positionEnPassant, setPositionEnPassant] = useState('-');
  const skipEnPassantResetRef = useRef(false);

  // Derive turn from color selection
  const positionTurn = useMemo(() => (color === 'white' ? 'w' : 'b'), [color]);

  // Full FEN built from parts
  const fullPositionFen = useMemo(
    () => buildFenFromParts(positionFen, positionTurn, positionCastling, positionEnPassant),
    [positionFen, positionTurn, positionCastling, positionEnPassant]
  );

  // Validate custom position FEN (single computation)
  const positionResult = useMemo(
    () => validatePosition(positionFen, fullPositionFen),
    [positionFen, fullPositionFen]
  );

  const positionValidation = useMemo((): { valid: boolean; error?: string } => {
    if (!positionResult.valid && positionResult.errorKey) {
      return { valid: false, error: t(positionResult.errorKey) };
    }
    if (positionResult.correctedColor && positionResult.correctedColor !== color) {
      return { valid: false, error: t('positionCheckCorrected') };
    }
    return { valid: positionResult.valid };
  }, [positionResult, t, color]);

  // Reset en passant when color changes (skip if FEN initialization triggered the color change)
  useEffect(() => {
    if (skipEnPassantResetRef.current) {
      skipEnPassantResetRef.current = false;
      return;
    }
    setPositionEnPassant('-');
  }, [color]);

  // Initialize from FEN URL parameter
  useEffect(() => {
    const urlFen = searchParams.get('fen');
    if (!urlFen) return;

    const parts = urlFen.split(' ');
    if (parts.length < 1) return;

    // Board part
    setPositionFen(parts[0]);

    // Turn → color (skip en passant reset triggered by this color change)
    if (parts[1] === 'w' || parts[1] === 'b') {
      skipEnPassantResetRef.current = true;
      setColor(parts[1] === 'w' ? 'white' : 'black');
      setFlipped(parts[1] === 'b');
    }

    // Castling rights
    if (parts[2]) {
      setPositionCastling({
        K: parts[2].includes('K'),
        Q: parts[2].includes('Q'),
        k: parts[2].includes('k'),
        q: parts[2].includes('q'),
      });
    }

    // En passant
    if (parts[3]) {
      setPositionEnPassant(parts[3]);
    }
  }, [searchParams]);

  // Compute castling availability based on piece positions
  const castlingAvailability = useMemo(() => getCastlingAvailability(positionFen), [positionFen]);

  // Compute en passant availability based on pawn positions
  const enPassantAvailability = useMemo(
    () => getEnPassantAvailability(positionFen, positionTurn),
    [positionFen, positionTurn]
  );

  // Auto-reset en passant when current selection becomes unavailable
  useEffect(() => {
    if (positionEnPassant !== '-') {
      const file = positionEnPassant[0];
      if (!enPassantAvailability[file]) {
        setPositionEnPassant('-');
      }
    }
  }, [enPassantAvailability, positionEnPassant]);

  // Auto-uncheck castling rights that become unavailable
  useEffect(() => {
    const updated = { ...positionCastling };
    let changed = false;
    for (const key of ['K', 'Q', 'k', 'q'] as const) {
      if (updated[key] && !castlingAvailability[key]) {
        updated[key] = false;
        changed = true;
      }
    }
    if (changed) {
      setPositionCastling(updated);
    }
  }, [castlingAvailability, positionCastling]);

  const handlePositionFenChange = useCallback((newFen: string) => {
    setPositionFen(newFen);
  }, []);

  const navigateToGame = () => {
    const params: Record<string, string> = {
      color,
      skillLevel: skillLevel.toString(),
      fen: fullPositionFen,
      gamePrefs: JSON.stringify(localSettings),
    };
    if (engine !== DEFAULT_ENGINE) params.engine = engine;
    const searchParams = new URLSearchParams(params);
    router.push(`/${locale}/games/play?${searchParams.toString()}`);
  };

  const handleStartGame = () => {
    setIsLoading(true);

    if (!positionValidation.valid) {
      setIsLoading(false);
      return;
    }

    if (engine === 'maia' && shouldWarnBeforeLargeDownload()) {
      setConsentDialogOpen(true);
      return;
    }
    navigateToGame();
  };

  const handleConsentConfirm = () => {
    setConsentDialogOpen(false);
    navigateToGame();
  };

  const handleConsentCancel = () => {
    setConsentDialogOpen(false);
    setIsLoading(false);
  };

  const editableBoardLabels = useMemo(
    () => ({
      whitePieces: t('positionSettings.whitePieces'),
      blackPieces: t('positionSettings.blackPieces'),
      removePieceMode: t('positionSettings.removePieceMode'),
      placingPiece: t('positionSettings.placingPiece'),
    }),
    [t]
  );

  const [positionSettingsOpen, setPositionSettingsOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div data-tour-id="position-editor">
        <SectionTitle>{t('customPosition')}</SectionTitle>
        <div className="flex justify-end mb-2">
          <FlipBoardButton onClick={() => setFlipped((prev) => !prev)} title={t('flipBoard')} />
        </div>
        {!isLoaded ? (
          <BoardSkeleton />
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
      <EngineSelector value={engine} onChange={setEngine} maiaUnlocked={maiaUnlocked} />
      <SkillLevelSelector value={skillLevel} onChange={setSkillLevel} engine={engine} />

      <SectionTitle>{t('gameSettings')}</SectionTitle>
      <CollapsibleGameSettings settings={localSettings} onSettingsChange={handleSettingsChange} />

      <Button
        onClick={handleStartGame}
        disabled={!positionValidation.valid}
        loading={isLoading}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {t('startGame')}
      </Button>

      <LargeDownloadConsentDialog
        isOpen={consentDialogOpen}
        onConfirm={handleConsentConfirm}
        onCancel={handleConsentCancel}
        sizeLabel={MAIA_MODEL_SIZE_LABEL}
      />
    </div>
  );
}
