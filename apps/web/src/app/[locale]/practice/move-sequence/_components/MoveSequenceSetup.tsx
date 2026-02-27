'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button, ChessBoard } from '@/app/_components';
import { ChessGameManager, validateFen } from '@blindfold-chess/features/chess-core';
import { FaInfoCircle, FaLink, FaPlay } from 'react-icons/fa';

import { BetaNotice, CardLink, PgnInput, SectionTitle } from '@/app/[locale]/_components';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { Modal } from '@/app/[locale]/_components/Modal';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { presetOpenings } from '../_data/presetOpenings';
import { parseMoveSequence } from '../_lib/pgn-parser';
import { encodeMoveSequenceToBase64, generateShareUrl } from '../_lib/share';
import { clearSettings, loadSettings, saveSettings } from '../_lib/storage';
import { AboutFeatureInfoModal } from './AboutFeatureInfoModal';
import { TUTORIAL_SKIPPED_KEY } from './TutorialSkipLink';

type CopyStatus = 'idle' | 'success' | 'error' | 'too_long';

const MAX_MOVES = 50;

type Props = {
  locale: Locale;
  urlFen: string | null;
  urlPgn: string | null;
  urlError: string | null;
};

export function MoveSequenceSetup({ locale, urlFen, urlPgn, urlError }: Props) {
  const t = useTranslations('practice.moveSequence');
  const router = useRouter();
  const { preferences } = useGamePreferences();

  const [fen, setFen] = useState('');
  const [pgn, setPgn] = useState('');
  const [includeOpponentMoves, setIncludeOpponentMoves] = useState(false);
  const [usePreset, setUsePreset] = useState(true);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    presetOpenings[0]?.id ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isShareLinkHelpOpen, setIsShareLinkHelpOpen] = useState(false);
  const [isAboutFeatureOpen, setIsAboutFeatureOpen] = useState(false);
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Preview state
  const [showPreview, setShowPreview] = useState(true);
  const [previewFen, setPreviewFen] = useState<string | null>(null);
  const [previewMoveIndex, setPreviewMoveIndex] = useState(-1);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const previewChessRef = useRef<ChessGameManager | null>(null);
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate preset data for preview
  const selectedPresetData = useMemo(() => {
    if (!selectedPresetId) return null;
    const preset = presetOpenings.find((p) => p.id === selectedPresetId);
    if (!preset) return null;

    try {
      const result = parseMoveSequence(preset.fen, preset.pgn);
      if (result.success) {
        return {
          startFen: preset.fen,
          moves: result.data.moves,
          pgn: preset.pgn,
        };
      }
      return null;
    } catch {
      return null;
    }
  }, [selectedPresetId]);

  // Reset preview when preset changes
  useEffect(() => {
    if (selectedPresetData) {
      setPreviewFen(selectedPresetData.startFen);
      setPreviewMoveIndex(-1);
      setIsPlayingPreview(false);
      setLastMove(null);
      previewChessRef.current = new ChessGameManager(selectedPresetData.startFen);
    }
  }, [selectedPresetData]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (previewIntervalRef.current) {
        clearTimeout(previewIntervalRef.current);
      }
    };
  }, []);

  const playNextPreviewMove = useCallback(() => {
    if (!previewChessRef.current || !selectedPresetData) return;

    const nextIndex = previewMoveIndex + 1;

    if (nextIndex >= selectedPresetData.moves.length) {
      setIsPlayingPreview(false);
      if (previewIntervalRef.current) {
        clearTimeout(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
      return;
    }

    const move = selectedPresetData.moves[nextIndex];
    try {
      const result = previewChessRef.current.move(move);
      setPreviewFen(previewChessRef.current.fen());
      setPreviewMoveIndex(nextIndex);
      setLastMove({ from: result.from, to: result.to });
    } catch {
      setIsPlayingPreview(false);
      if (previewIntervalRef.current) {
        clearTimeout(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
    }
  }, [previewMoveIndex, selectedPresetData]);

  // Timer effect for preview playback
  useEffect(() => {
    if (isPlayingPreview && previewMoveIndex >= 0 && selectedPresetData) {
      previewIntervalRef.current = setTimeout(playNextPreviewMove, 800);
    }

    return () => {
      if (previewIntervalRef.current) {
        clearTimeout(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
    };
  }, [isPlayingPreview, previewMoveIndex, selectedPresetData, playNextPreviewMove]);

  // Cleanup validation timer on unmount
  useEffect(() => {
    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, []);

  const handlePlayPreview = useCallback(() => {
    if (isPlayingPreview || !selectedPresetData) return;

    previewChessRef.current = new ChessGameManager(selectedPresetData.startFen);
    setPreviewFen(selectedPresetData.startFen);
    setPreviewMoveIndex(-1);
    setLastMove(null);
    setIsPlayingPreview(true);

    setTimeout(() => {
      playNextPreviewMove();
    }, 300);
  }, [isPlayingPreview, selectedPresetData, playNextPreviewMove]);

  // Load settings from localStorage on mount (URL params handled separately in page.tsx)
  useEffect(() => {
    // URL params take priority
    if (urlFen !== null && urlPgn !== null) {
      setFen(urlFen);
      setPgn(urlPgn);
      setUsePreset(false);
      setHasLoaded(true);
      return;
    }

    // Otherwise, load from localStorage
    const settings = loadSettings();
    setFen(settings.fen);
    setPgn(settings.pgn);
    setIncludeOpponentMoves(settings.includeOpponentMoves);
    // Switch to custom input tab if PGN is saved (indicates user has entered custom data)
    if (settings.pgn.trim()) {
      setUsePreset(false);
    }
    setHasLoaded(true);
  }, [urlFen, urlPgn]);

  // Show URL error if present
  useEffect(() => {
    if (urlError) {
      setError(t(urlError as 'url_too_long' | 'invalid_data' | 'invalid_fen'));
    }
  }, [urlError, t]);

  // Save settings when they change
  useEffect(() => {
    if (!hasLoaded) return;
    saveSettings({ fen, pgn, includeOpponentMoves });
  }, [fen, pgn, includeOpponentMoves, hasLoaded]);

  const handleStart = () => {
    setError(null);

    let startFen: string;
    let startPgn: string;

    if (usePreset) {
      const preset = presetOpenings.find((p) => p.id === selectedPresetId);
      if (!preset) {
        setError('Please select a preset');
        return;
      }
      startFen = preset.fen;
      startPgn = preset.pgn;
    } else {
      if (!fen.trim()) {
        setError(t('fenRequired'));
        return;
      }

      if (!pgn.trim()) {
        setError(t('pgnRequired'));
        return;
      }

      // Use validateInput for translated error messages
      const validationError = validateInput(fen.trim(), pgn.trim());
      if (validationError) {
        setError(validationError);
        return;
      }

      startFen = fen.trim();
      startPgn = pgn.trim();

      // Save settings before navigating (only for custom mode)
      saveSettings({ fen: startFen, pgn: startPgn, includeOpponentMoves });
    }

    // Build URL params
    const params = new URLSearchParams();
    const encoded = encodeMoveSequenceToBase64(startFen, startPgn);
    params.set('data', encoded);
    if (includeOpponentMoves) {
      params.set('includeOpponentMoves', '1');
    }

    // Navigate to session page
    router.push(
      `/${locale}/practice/move-sequence/session?${params.toString()}#move-sequence-session`
    );
  };

  // Validate FEN and PGN and return translated error message
  const validateInput = useCallback(
    (fenValue: string, pgnValue: string): string | null => {
      if (!fenValue.trim() || !pgnValue.trim()) {
        return null; // Don't show error if fields are empty
      }

      // Validate FEN
      if (!validateFen(fenValue.trim())) {
        return t('invalidFen');
      }

      // Validate PGN
      const result = parseMoveSequence(fenValue.trim(), pgnValue.trim());
      if (!result.success) {
        // Translate error messages
        if (result.error.includes('No moves found')) {
          return t('noMovesFound');
        }
        if (result.error.includes('No valid moves found')) {
          return t('noMovesFound');
        }
        if (result.error.includes('Invalid FEN')) {
          return t('invalidFen');
        }
        // Parse "Move X "Y" is invalid" pattern
        const moveErrorMatch = result.error.match(/Move (\d+) "([^"]+)" is invalid/);
        if (moveErrorMatch) {
          return t('invalidMoveAt', { index: moveErrorMatch[1], move: moveErrorMatch[2] });
        }
        return t('invalidPgn');
      }

      // Check move count limit
      if (result.data.moves.length > MAX_MOVES) {
        return t('pgnTooLong', { max: MAX_MOVES });
      }

      return null;
    },
    [t]
  );

  // Debounced validation
  const runValidation = useCallback(
    (fenValue: string, pgnValue: string) => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
      validationTimerRef.current = setTimeout(() => {
        const validationError = validateInput(fenValue, pgnValue);
        setError(validationError);
      }, 500);
    },
    [validateInput]
  );

  const handleFenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFen = e.target.value;
    setFen(newFen);
    runValidation(newFen, pgn);
  };

  const handlePgnChange = (value: string) => {
    setPgn(value);
    runValidation(fen, value);
  };

  const handleCopyShareLink = () => {
    if (!fen.trim() || !pgn.trim()) {
      return;
    }

    const { url, isTooLong } = generateShareUrl(locale, fen.trim(), pgn.trim());

    if (isTooLong) {
      setCopyStatus('too_long');
      setTimeout(() => setCopyStatus('idle'), 3000);
      return;
    }

    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), 3000);
      })
      .catch(() => {
        setCopyStatus('error');
        setTimeout(() => setCopyStatus('idle'), 3000);
      });
  };

  const canShare = fen.trim() && pgn.trim();

  const handleResetConfirm = () => {
    clearSettings();
    localStorage.removeItem(TUTORIAL_SKIPPED_KEY);
    setIsResetConfirmOpen(false);
    router.push(`/${locale}/practice/move-sequence/tutorial`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <SectionTitle className="mb-6">
          <span className="inline-flex items-center gap-2">
            {t('title')}
            <button
              type="button"
              onClick={() => setIsAboutFeatureOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Show feature information"
            >
              <FaInfoCircle className="w-4 h-4" />
            </button>
          </span>
        </SectionTitle>

        <BetaNotice className="mb-6">
          <p>{t('betaNotice')}</p>
        </BetaNotice>

        <div className="space-y-6">
          {/* Problem Source Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('problemSource')}
            </label>
            <div className="flex rounded-lg bg-secondary p-1">
              <button
                type="button"
                onClick={() => setUsePreset(true)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  usePreset
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('presetProblems')}
              </button>
              <button
                type="button"
                onClick={() => setUsePreset(false)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  !usePreset
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('enterCustom')}
              </button>
            </div>
          </div>

          {/* Preset Problems List */}
          {usePreset && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('presetDescription')}
              </label>
              <div className="space-y-2">
                {presetOpenings.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      if (selectedPresetId === preset.id) {
                        // Same preset clicked - toggle preview
                        setShowPreview(!showPreview);
                      } else {
                        // Different preset clicked - select and show preview
                        setSelectedPresetId(preset.id);
                        setShowPreview(true);
                      }
                    }}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedPresetId === preset.id && showPreview
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-secondary/50'
                    }`}
                  >
                    <span className="font-medium">{preset.title}</span>
                  </button>
                ))}
              </div>

              {/* Preview Content */}
              {selectedPresetData && showPreview && (
                <div className="mt-4">
                  <div className="max-w-xs mx-auto">
                    <div className="relative">
                      <ChessBoard
                        fen={previewFen || selectedPresetData.startFen}
                        showCoordinates={true}
                        flipped={false}
                        boardTheme={preferences.boardTheme}
                        lastMove={preferences.highlightLastMove ? lastMove : null}
                      />

                      {/* Play button overlay */}
                      {!isPlayingPreview && previewMoveIndex < 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                          <button
                            onClick={handlePlayPreview}
                            className="bg-white/90 hover:bg-white text-gray-800 rounded-full p-4 shadow-lg transition-all hover:scale-110"
                            aria-label={t('play')}
                          >
                            <FaPlay className="w-6 h-6 ml-0.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Move display */}
                  <div className="mt-3 bg-secondary/30 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground mb-1">{t('moves')}</p>
                    <p className="font-mono text-sm">
                      {selectedPresetData.moves.map((move, i) => (
                        <span
                          key={i}
                          className={
                            i <= previewMoveIndex ? 'text-foreground' : 'text-muted-foreground'
                          }
                        >
                          {i % 2 === 0 && (
                            <span className="text-muted-foreground">{Math.floor(i / 2) + 1}. </span>
                          )}
                          {move}{' '}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom FEN/PGN Input */}
          {!usePreset && (
            <>
              {/* FEN Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('fenLabel')}
                </label>
                <input
                  type="text"
                  value={fen}
                  onChange={handleFenChange}
                  placeholder={t('fenPlaceholder')}
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
                <p className="mt-2 text-xs text-muted-foreground">{t('fenHint')}</p>
              </div>

              {/* PGN Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('pgnLabel')}
                </label>
                <PgnInput
                  value={pgn}
                  onChange={handlePgnChange}
                  placeholder={t('pgnPlaceholder')}
                  heightClass="h-32"
                  showValidation={false}
                />

                {/* Validation Error */}
                {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

                {/* Share Link Button */}
                {canShare && (
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={handleCopyShareLink}
                      className="flex items-center justify-center gap-2 px-3 py-1.5 bg-secondary text-foreground text-sm rounded-md hover:bg-secondary/80 transition-colors"
                    >
                      <FaLink className="text-xs" />
                      <span>{t('copyShareLink')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsShareLinkHelpOpen(true)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Show share link information"
                    >
                      <FaInfoCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Copy Status Messages */}
                {copyStatus === 'success' && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    {t('linkCopied')}
                  </p>
                )}
                {copyStatus === 'error' && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{t('copyFailed')}</p>
                )}
                {copyStatus === 'too_long' && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{t('urlTooLong')}</p>
                )}
              </div>
            </>
          )}

          {/* Include Opponent Moves Toggle */}
          <div className="flex items-center justify-end gap-3">
            <label htmlFor="includeOpponentMoves" className="text-sm text-muted-foreground">
              {t('includeOpponentMoves')}
            </label>
            <button
              id="includeOpponentMoves"
              type="button"
              role="switch"
              aria-checked={includeOpponentMoves}
              onClick={() => setIncludeOpponentMoves(!includeOpponentMoves)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                includeOpponentMoves ? 'bg-foreground' : 'bg-secondary'
              }`}
            >
              <span className="sr-only">{t('includeOpponentMoves')}</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  includeOpponentMoves ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStart}
            variant="primary"
            size="lg"
            className="w-full"
            icon={<FaPlay />}
          >
            {t('start')}
          </Button>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)}>
          {t('resetSettings')}
        </Button>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border mt-8 space-y-4">
        <SectionTitle>{t('relatedArticles')}</SectionTitle>
        <CardLink
          href="/learn/notation/algebraic-notation"
          icon="🔤"
          title={t('articles.algebraicNotation.title')}
          description={t('articles.algebraicNotation.description')}
          locale={locale}
        />
      </div>

      <ConfirmationModal
        isOpen={isResetConfirmOpen}
        title={t('resetSettingsConfirm.title')}
        message={t('resetSettingsConfirm.message')}
        confirmText={t('resetSettings')}
        cancelText={t('cancel')}
        confirmVariant="danger"
        onConfirm={handleResetConfirm}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* Share Link Help Modal */}
      <Modal
        isOpen={isShareLinkHelpOpen}
        title={t('copyShareLink')}
        onClose={() => setIsShareLinkHelpOpen(false)}
        maxWidth="max-w-md"
      >
        <p className="text-foreground">{t('shareLinkHelp')}</p>
      </Modal>

      <AboutFeatureInfoModal
        isOpen={isAboutFeatureOpen}
        onClose={() => setIsAboutFeatureOpen(false)}
      />
    </div>
  );
}
