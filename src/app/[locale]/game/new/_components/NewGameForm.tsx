'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import { PageTitle } from '../../../_components/PageTitle';
import { StartMethodSelector } from './StartMethodSelector';
import { ColorSelector } from './ColorSelector';
import { SkillLevelSelector } from './SkillLevelSelector';
import { PgnInput } from './PgnInput';
import { validatePgn, parsePgn } from '../../../play/_lib/pgn-parser';
import type { Side, SkillLevel } from '../../../play/_lib/types';

type StartMethod = 'new' | 'pgn';

interface NewGameFormProps {
  locale: 'en' | 'ja';
  translations: {
    title: string;
    // Start Method
    startMethod: string;
    newGame: string;
    newGameDescription: string;
    fromPgn: string;
    fromPgnDescription: string;
    // PGN
    pgnTitle: string;
    pgnPlaceholder: string;
    validWithMoves: string;
    validWithMovesCount: string;
    invalidPgn: string;
    derivedFromPgn: string;
    // Color
    selectColor: string;
    playAsWhite: string;
    playAsBlack: string;
    whiteDescription: string;
    blackDescription: string;
    // Skill Level
    selectLevel: string;
    beginner: string;
    intermediate: string;
    advanced: string;
    // Buttons
    startGame: string;
    cancel: string;
  };
}

export function NewGameForm({ locale, translations }: NewGameFormProps) {
  const router = useRouter();
  const [startMethod, setStartMethod] = useState<StartMethod>('new');
  const [color, setColor] = useState<Side>('white');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(5);
  const [pgn, setPgn] = useState('');
  const [pgnError, setPgnError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-derive color from PGN when PGN method is selected
  useEffect(() => {
    if (startMethod === 'pgn' && pgn.trim() && validatePgn(pgn)) {
      try {
        const chess = new Chess();
        chess.loadPgn(pgn);
        const history = chess.history({ verbose: true });

        if (history.length > 0) {
          // Determine which color made the last move
          const lastMove = history[history.length - 1];
          // If last move was by white, user should play as black (next to move)
          // If last move was by black, user should play as white (next to move)
          const derivedColor: Side = lastMove.color === 'w' ? 'black' : 'white';
          setColor(derivedColor);
        }
      } catch {
        // If PGN parsing fails, keep current color selection
      }
    }
  }, [startMethod, pgn]);

  const handlePgnChange = (value: string) => {
    setPgn(value);
    setPgnError(null);

    // Real-time validation
    if (value.trim() && !validatePgn(value)) {
      setPgnError(translations.invalidPgn);
    }
  };

  const handleStartGame = async () => {
    setIsLoading(true);

    try {
      let moves: string[] | undefined;
      if (startMethod === 'pgn') {
        if (!pgn.trim()) {
          setPgnError(translations.invalidPgn);
          setIsLoading(false);
          return;
        }

        if (!validatePgn(pgn)) {
          setPgnError(translations.invalidPgn);
          setIsLoading(false);
          return;
        }

        moves = parsePgn(pgn);
      }

      const finalColor: Side = color;

      // Navigate to game play screen with settings
      const searchParams = new URLSearchParams({
        color: finalColor,
        skillLevel: skillLevel.toString(),
      });

      // Add moves if from PGN
      if (moves && moves.length > 0) {
        searchParams.set('moves', JSON.stringify(moves));
      }

      router.push(`/${locale}/play?${searchParams.toString()}`);
    } catch {
      setPgnError(translations.invalidPgn);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${locale}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <PageTitle>{translations.title}</PageTitle>
      </div>

      <div className="space-y-8">
        {/* Start Method Selector */}
        <StartMethodSelector
          value={startMethod}
          onChange={setStartMethod}
          translations={translations}
        />

        {/* PGN Input (only show if pgn method selected) */}
        {startMethod === 'pgn' && (
          <PgnInput
            value={pgn}
            onChange={handlePgnChange}
            error={pgnError}
            translations={translations}
          />
        )}

        {/* Color Selection (disabled when using PGN with valid moves) */}
        <div>
          <ColorSelector
            value={color}
            onChange={setColor}
            disabled={startMethod === 'pgn' && !!pgn.trim() && validatePgn(pgn)}
            translations={translations}
          />
          {startMethod === 'pgn' && pgn.trim() && validatePgn(pgn) && (
            <p className="text-sm text-muted-foreground mt-2">{translations.derivedFromPgn}</p>
          )}
        </div>

        {/* Skill Level Selection */}
        <SkillLevelSelector
          value={skillLevel}
          onChange={setSkillLevel}
          translations={translations}
        />

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleCancel}
            className="flex-1 px-6 py-3 text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg font-medium transition-colors"
          >
            {translations.cancel}
          </button>
          <button
            onClick={handleStartGame}
            disabled={isLoading || (startMethod === 'pgn' && (!pgn.trim() || !!pgnError))}
            className="flex-1 px-6 py-3 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {isLoading ? '...' : translations.startGame}
          </button>
        </div>
      </div>
    </div>
  );
}
