'use client';

import { useCallback, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button, ChessBoard, ProgressBar } from '@/app/_components';
import { Chess } from 'chess.js';
import { FaCheck, FaChevronDown, FaEye, FaEyeSlash, FaQuestionCircle } from 'react-icons/fa';

import type { AlgebraicNotation } from '@/lib/types';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';
import { MoveInput } from '@/app/[locale]/play/_components/MoveInput';

type Props = {
  locale: Locale;
  pgn: string;
  playerColor: 'white' | 'black';
  autoOpponent: boolean;
  initialOffset?: number;
};

export function PostmortemClient({
  locale,
  pgn,
  playerColor,
  autoOpponent: initialAutoOpponent,
  initialOffset = 0,
}: Props) {
  const t = useTranslations('postmortem');
  const router = useRouter();
  const { preferences } = useGamePreferences();

  // Parse PGN to get original moves
  const [originalMoves, setOriginalMoves] = useState<AlgebraicNotation[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(initialOffset);
  const [userMoves, setUserMoves] = useState<AlgebraicNotation[]>([]);
  const [moveInput, setMoveInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [autoOpponent, setAutoOpponent] = useState(initialAutoOpponent);
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const [showCorrect, setShowCorrect] = useState(false);

  // Parse PGN on mount
  useEffect(() => {
    try {
      const chess = new Chess();
      // Remove move numbers and periods from PGN
      const cleanPgn = pgn.replace(/\d+\.\s*/g, '').replace(/\.\./g, '');
      const moves = cleanPgn.trim().split(/\s+/).filter(Boolean);

      // Validate moves
      const validMoves: AlgebraicNotation[] = [];
      for (const move of moves) {
        const result = chess.move(move);
        if (result) {
          validMoves.push(move as AlgebraicNotation);
        } else {
          break;
        }
      }

      setOriginalMoves(validMoves);

      // Restore moves from offset
      if (initialOffset > 0 && initialOffset <= validMoves.length) {
        const restoredMoves = validMoves.slice(0, initialOffset);
        setUserMoves(restoredMoves);
      }
    } catch (error) {
      console.error('Error parsing PGN:', error);
    }
  }, [pgn, initialOffset]);

  // Get current FEN for board display
  const getCurrentFen = useCallback(() => {
    const chess = new Chess();
    for (let i = 0; i < userMoves.length; i++) {
      chess.move(userMoves[i]);
    }
    return chess.fen();
  }, [userMoves]);

  // Check if current move is player's turn
  const isPlayerTurn = useCallback(() => {
    // If autoOpponent is disabled, player enters all moves
    if (!autoOpponent) return true;

    const isWhiteTurn = currentMoveIndex % 2 === 0;
    return (playerColor === 'white' && isWhiteTurn) || (playerColor === 'black' && !isWhiteTurn);
  }, [currentMoveIndex, playerColor, autoOpponent]);

  // Update URL with current offset
  useEffect(() => {
    if (originalMoves.length > 0 && currentMoveIndex > 0) {
      const params = new URLSearchParams(window.location.search);
      params.set('offset', currentMoveIndex.toString());
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [currentMoveIndex, originalMoves.length]);

  // Auto-fill opponent's move if needed
  useEffect(() => {
    if (
      autoOpponent &&
      !isPlayerTurn() &&
      currentMoveIndex < originalMoves.length &&
      !isCompleted
    ) {
      // Auto-fill opponent's move
      const opponentMove = originalMoves[currentMoveIndex];
      const newIndex = currentMoveIndex + 1;
      setUserMoves((prev) => [...prev, opponentMove]);
      setCurrentMoveIndex(newIndex);

      // Check if completed after auto-fill
      if (newIndex >= originalMoves.length) {
        setIsCompleted(true);
      }
    }
  }, [autoOpponent, isPlayerTurn, currentMoveIndex, originalMoves, isCompleted]);

  // Handle move submission
  const handleSubmitMove = useCallback(
    (move: AlgebraicNotation) => {
      const expectedMove = originalMoves[currentMoveIndex];

      if (move === expectedMove) {
        // Correct move
        const newIndex = currentMoveIndex + 1;
        setUserMoves((prev) => [...prev, move]);
        setCurrentMoveIndex(newIndex);
        setMoveInput('');
        setError(null);

        // Check if completed
        if (newIndex >= originalMoves.length) {
          setIsCompleted(true);
          setShowCorrect(false); // Hide correct message when completed
        } else {
          setShowCorrect(true);
        }
      } else {
        // Incorrect move
        setError(t('incorrectMove'));
      }
    },
    [currentMoveIndex, originalMoves, t]
  );

  // Handle "I don't know" button
  const handleDontKnow = useCallback(() => {
    const correctMove = originalMoves[currentMoveIndex];
    const newIndex = currentMoveIndex + 1;
    setUserMoves((prev) => [...prev, correctMove]);
    setCurrentMoveIndex(newIndex);
    setMoveInput('');
    setError(null);
    setShowCorrect(false);

    // Check if completed
    if (newIndex >= originalMoves.length) {
      setIsCompleted(true);
    }
  }, [currentMoveIndex, originalMoves]);

  // Handle back to game
  const handleBackToGame = useCallback(() => {
    router.push(`/${locale}/play`);
  }, [router, locale]);

  const currentFen = getCurrentFen();
  const totalMoves = originalMoves.length;
  const progress = currentMoveIndex;

  // Format moves for display (like in PlayClient)
  const getFormattedPgn = useCallback(() => {
    const formatted: { moveNumber: number; whiteMove: string; blackMove?: string }[] = [];
    for (let i = 0; i < userMoves.length; i += 2) {
      formatted.push({
        moveNumber: Math.floor(i / 2) + 1,
        whiteMove: userMoves[i],
        blackMove: userMoves[i + 1],
      });
    }
    return formatted;
  }, [userMoves]);

  const formattedPgn = getFormattedPgn();

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chess Board */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-lg shadow-lg">
            {/* Board Toggle Header */}
            <button
              onClick={() => setIsBoardVisible(!isBoardVisible)}
              className={`w-full px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-border/50 focus:ring-inset rounded-t-lg ${!isBoardVisible ? 'rounded-b-lg' : ''}`}
              aria-expanded={isBoardVisible}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isBoardVisible ? (
                    <FaEye className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <FaEyeSlash className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-foreground">
                    {isBoardVisible ? t('hideBoard') : t('showBoard')}
                  </span>
                </div>
                <FaChevronDown
                  className={`w-5 h-5 text-muted-foreground transform transition-transform duration-200 ${
                    isBoardVisible ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Board Content */}
            <div
              className={`transition-all duration-300 ${isBoardVisible ? 'block' : 'hidden'} rounded-b-lg`}
            >
              <div className="p-4">
                <ChessBoard
                  fen={currentFen}
                  flipped={playerColor === 'black'}
                  playerSide={playerColor}
                  showCoordinates={preferences.showCoordinates}
                  showOwnPieces={preferences.showOwnPieces}
                  showOpponentPieces={preferences.showOpponentPieces}
                  pieceShapeMode={preferences.pieceShapeMode}
                  pieceColors={preferences.pieceColors}
                  boardTheme={preferences.boardTheme}
                  className="max-w-2xl mx-auto"
                />
              </div>
            </div>
          </div>

          {/* Progress Bar, Input, Actions - White background like play screen */}
          <div className="mt-6 bg-card rounded-lg shadow-lg p-4">
            {/* Progress Bar */}
            <div className="mb-6">
              <ProgressBar current={progress} total={totalMoves} />
            </div>

            {!isCompleted ? (
              <>
                {/* Move Input */}
                <div className="mb-4">
                  <div>
                    <MoveInput
                      value={moveInput}
                      onChange={(value) => {
                        setMoveInput(value);
                        if (error) setError(null);
                        if (showCorrect) setShowCorrect(false);
                      }}
                      onSubmit={handleSubmitMove}
                      disabled={false}
                      placeholder={t('inputMove')}
                      showSuggestions={preferences.enableAutoComplete}
                      showSubmitButton={true}
                    />
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    {showCorrect && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm mt-2">
                        <FaCheck className="w-4 h-4" />
                        <span>{t('correctMove')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons and Settings */}
                <div className="pb-2">
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="secondary"
                      onClick={handleDontKnow}
                      icon={<FaQuestionCircle className="w-4 h-4" />}
                      disabled={false}
                      className="px-4 py-2"
                    >
                      {t('dontKnow')}
                    </Button>
                  </div>

                  {/* Auto-opponent checkbox */}
                  <div className="mt-4 text-center">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoOpponent}
                        onChange={(e) => setAutoOpponent(e.target.checked)}
                        className="w-4 h-4 rounded border-border"
                      />
                      <span className="text-sm text-muted-foreground">
                        {t('autoOpponentMoves')}
                      </span>
                    </label>
                  </div>
                </div>
              </>
            ) : (
              /* Completion Message */
              <div className="py-8 text-center">
                <FaCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">{t('completed')}</h3>
                <p className="text-muted-foreground">{t('completedMessage')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Move List */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow-lg">
            {/* Moves Header */}
            <div className="px-4 py-3 bg-muted/30 rounded-t-lg">
              <span className="text-foreground font-medium">{t('moves')}</span>
            </div>

            {/* Moves Content */}
            <div className="p-4 max-h-[70vh] overflow-y-auto font-mono">
              {formattedPgn.length > 0 ? (
                <div className="space-y-0.5">
                  {formattedPgn.map((move, index) => (
                    <div key={move.moveNumber} className="flex items-center text-sm">
                      <span className="w-10 text-right pr-2 text-muted-foreground">
                        {move.moveNumber}.
                      </span>
                      <span className="flex-1 px-2 py-0.5">{move.whiteMove}</span>
                      <span className="flex-1 px-2 py-0.5">{move.blackMove || ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No moves yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
