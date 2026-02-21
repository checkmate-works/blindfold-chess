'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import type { Side } from '@blindfold-chess/types';
import { FaChevronDown } from 'react-icons/fa';

import type { SkillLevel } from '@/lib/types';

import { SectionTitle } from '@/app/[locale]/_components';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { ColorSelector } from '@/app/[locale]/games/new/_components/ColorSelector';
import {
  type CastlingRights,
  PositionSettings,
} from '@/app/[locale]/games/new/_components/PositionSettings';
import { SkillLevelSelector } from '@/app/[locale]/games/new/_components/SkillLevelSelector';
import { buildFenFromParts } from '@/app/[locale]/games/new/_lib/build-fen-from-parts';
import { getCastlingAvailability } from '@/app/[locale]/games/new/_lib/get-castling-availability';
import { validatePosition } from '@/app/[locale]/games/new/_lib/validate-position';
import { EditableChessBoard } from '@/app/[locale]/practice/_components/EditableChessBoard';

const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

type Props = {
  locale: Locale;
};

export function PositionGameForm({ locale }: Props) {
  const t = useTranslations('newGame');
  const router = useRouter();
  const { preferences } = useGamePreferences();
  const [color, setColor] = useState<Side>('white');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);
  const [isLoading, setIsLoading] = useState(false);
  const [checkCorrected, setCheckCorrected] = useState(false);

  // Custom position state
  const [positionFen, setPositionFen] = useState(EMPTY_BOARD_FEN);
  const [positionCastling, setPositionCastling] = useState<CastlingRights>({
    K: false,
    Q: false,
    k: false,
    q: false,
  });
  const [positionEnPassant, setPositionEnPassant] = useState('-');

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
    return { valid: positionResult.valid };
  }, [positionResult, t]);

  // Handle check auto-correction
  useEffect(() => {
    if (positionResult.correctedColor) {
      setColor(positionResult.correctedColor);
      setCheckCorrected(true);
    } else {
      setCheckCorrected(false);
    }
  }, [positionResult]);

  // Reset en passant when color changes
  useEffect(() => {
    setPositionEnPassant('-');
  }, [color]);

  // Compute castling availability based on piece positions
  const castlingAvailability = useMemo(() => getCastlingAvailability(positionFen), [positionFen]);

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

  const handleStartGame = () => {
    setIsLoading(true);

    if (!positionValidation.valid) {
      setIsLoading(false);
      return;
    }

    const searchParams = new URLSearchParams({
      color,
      skillLevel: skillLevel.toString(),
      fen: fullPositionFen,
    });

    router.push(`/${locale}/play?${searchParams.toString()}`);
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
      <SectionTitle>{t('customPosition')}</SectionTitle>
      <EditableChessBoard
        fen={positionFen}
        onFenChange={handlePositionFenChange}
        labels={editableBoardLabels}
        editable
        flipped={color === 'black'}
        boardTheme={preferences.boardTheme}
        showCoordinates={preferences.showCoordinates}
      />

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
                onEnPassantChange={setPositionEnPassant}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Color Selection */}
      <SectionTitle>{t('selectColor')}</SectionTitle>
      <ColorSelector value={color} onChange={setColor} />

      {/* Validation message */}
      {positionValidation.error && (
        <p className="text-sm text-red-500">{positionValidation.error}</p>
      )}
      {checkCorrected && <p className="text-sm text-blue-600">{t('positionCheckCorrected')}</p>}
      {positionValidation.valid && <p className="text-sm text-green-600">{t('positionValid')}</p>}

      {/* Skill Level Selection */}
      <SkillLevelSelector value={skillLevel} onChange={setSkillLevel} />

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
    </div>
  );
}
