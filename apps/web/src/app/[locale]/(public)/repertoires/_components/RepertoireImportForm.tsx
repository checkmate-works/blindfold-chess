'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useSubmitError } from '@/_hooks/useSubmitError';
import { useUnsavedChanges } from '@/_hooks/useUnsavedChanges';
import {
  Button,
  FieldError,
  FormErrorBanner,
  TextInput,
  Textarea,
  fieldErrorProps,
} from '@/app/_components';
import { UnsavedChangesDialog } from '@/app/_components/UnsavedChangesDialog';
import { useRouter } from '@/i18n/routing';
import { flushSync } from 'react-dom';
import { FaPlus } from 'react-icons/fa';

import type { BoardAnnotations } from '@/lib/board-annotations/types';
import { isEmptyBoardAnnotations } from '@/lib/board-annotations/types';
// Pure catalog leaf (not the '@/lib/points' barrel) — client-safe, no server-only.
import type { RepertoireVisibility } from '@/lib/points/spend-catalog';
import { REPERTOIRE_VISIBILITIES, REPERTOIRE_VISIBILITY_COST } from '@/lib/points/spend-catalog';
import { detectOpeningIdsFromPgn } from '@/lib/repertoires/detect-openings';
import type { RepertoireFormField } from '@/lib/repertoires/form-error-fields';
import { repertoireErrorField } from '@/lib/repertoires/form-error-fields';
import type { OpeningOption } from '@/lib/repertoires/opening-queries';
import type { RepertoirePhase, RepertoireSide } from '@/lib/repertoires/validation';
import { REPERTOIRE_DESCRIPTION_MAX, REPERTOIRE_NAME_MAX } from '@/lib/repertoires/validation';

import { BoardFenTabs } from '@/app/[locale]/(public)/practice/(free-play)/_components/BoardFenTabs';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { PgnDiagnosisHint } from '@/app/[locale]/_components/PgnDiagnosisHint';

import { createRepertoire } from '../_actions/createRepertoire';
import { MoveAnnotationField } from './MoveAnnotationField';
import { OpeningLinksField } from './OpeningLinksField';
import { RepertoireBoardBuilder } from './RepertoireBoardBuilder';

const PHASES: readonly RepertoirePhase[] = ['opening', 'middlegame', 'endgame'];

/**
 * Only `opening` can be authored today: a middlegame or endgame repertoire is
 * meaningless without a custom starting position, and this form has no way to
 * set one (the PGN is assumed to start from the standard position). The other
 * two phases stay visible — the schema and the browse pages already support
 * them — but are locked behind a "coming soon" affordance until a starting-
 * position picker exists. Unlock by removing the disabled/overlay branch here.
 */
const AUTHORABLE_PHASES: readonly RepertoirePhase[] = ['opening'];

/** The controls this form renders a rejection against. */
const FIELDS: readonly RepertoireFormField[] = ['name', 'moves'];

/** RepertoireVisibility (snake) → its `Repertoires.visibility.*` i18n key (camel). */
const VISIBILITY_I18N_KEY: Record<RepertoireVisibility, string> = {
  public: 'public',
  followers_only: 'followersOnly',
  private: 'private',
};

type Props = {
  openings: OpeningOption[];
  /** The author's spendable coin balance — shown next to the paid tiers. */
  spendableBalance: number;
  /** Prefills the PGN textarea — e.g. a finished game handed in by another feature. */
  initialPgn?: string;
  /** Prefills the side radio to match {@link initialPgn}'s player colour. */
  initialSide?: RepertoireSide;
  /**
   * Prefilled kata name (localized "My System - {username}", built server-side
   * where the profile is at hand). Freely editable — just a starting point so
   * the required field never blocks a quick import.
   */
  initialName?: string;
};

/**
 * Import form for a repertoire (型): name, your side, the game phase, and a
 * PGN-with-variations. When the phase is `opening`, an opening picker links the
 * repertoire to one or more `chess_openings` (n:n). The PGN is decomposed
 * server-side into one line per variation; validation (move legality across all
 * variations) also happens in `createRepertoire`.
 */
export function RepertoireImportForm({
  openings,
  spendableBalance,
  initialPgn,
  initialSide,
  initialName,
}: Props) {
  const t = useTranslations('Repertoires');
  const router = useRouter();

  const [name, setName] = useState(initialName ?? '');
  const [description, setDescription] = useState('');
  const [side, setSide] = useState<RepertoireSide>(initialSide ?? 'white');
  const [phase, setPhase] = useState<RepertoirePhase>('opening');
  // Visibility to create-and-publish at. `public` is free; the paid tiers open
  // a coin-confirm modal before submitting.
  const [visibility, setVisibility] = useState<RepertoireVisibility>('public');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [openingIds, setOpeningIds] = useState<string[]>([]);
  const [pgn, setPgn] = useState(initialPgn ?? '');
  // How the moves are entered: pasting a PGN or playing them on a board. Both
  // modes read and write the same `pgn` state — the board serializes its move
  // tree through it — so detection, validation and submission are shared.
  const [inputMode, setInputMode] = useState<'pgn' | 'board'>('pgn');
  // Per-position "why this move" drafts and board markup, authored on the
  // board for whichever move the cursor rests on; created with the kata.
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const [shapes, setShapes] = useState<Record<string, BoardAnnotations>>({});
  const [cursor, setCursor] = useState<{ positionKey: string; label: string } | null>(null);
  const [pending, setPending] = useState(false);
  // A rejected submit is reported against the control at fault (see
  // `repertoireErrorField`) and focuses it — this form is several screens tall,
  // so a message rendered only next to the button leaves the author reading
  // "Please paste a PGN" nowhere near the moves field it is about. The moves
  // editor anchors on its section wrapper while the board tab is up, since the
  // PGN textarea isn't mounted there.
  const submitError = useSubmitError<RepertoireFormField>((field) => {
    if (field === 'name') return 'repertoire-name';
    return inputMode === 'board' ? 'repertoire-moves' : 'repertoire-pgn';
  });
  const nameError = submitError.messageFor('name');
  const movesError = submitError.messageFor('moves');
  // Successful submit: flipped (synchronously) before router.push so the
  // navigation guard below doesn't challenge the redirect to the new kata.
  const [submitted, setSubmitted] = useState(false);

  // Guard back/away navigation once the author has changed the content
  // fields (name / moves) from what the page loaded with — prefills don't
  // count. Same reusable pieces as the chunk / puzzle / topic forms.
  const tUnsaved = useTranslations('unsavedChanges');
  const hasAnnotationDrafts =
    Object.values(annotations).some((text) => text.trim()) ||
    Object.values(shapes).some((s) => !isEmptyBoardAnnotations(s));
  const isDirty =
    !submitted &&
    (name !== (initialName ?? '') ||
      description !== '' ||
      pgn !== (initialPgn ?? '') ||
      hasAnnotationDrafts);
  const { isBlocking, confirm, cancel } = useUnsavedChanges({ isDirty });

  // Once the author picks or removes an opening by hand, the PGN stops driving
  // the links — auto-detection is a starting point, not a correction.
  const openingsEdited = useRef(false);

  // Derive the opening links from what was pasted, while the author hasn't
  // touched the picker. Debounced so a long PGN isn't re-parsed per keystroke.
  useEffect(() => {
    if (phase !== 'opening' || openingsEdited.current) return;
    const timer = setTimeout(() => {
      setOpeningIds(detectOpeningIdsFromPgn(pgn, openings));
    }, 300);
    return () => clearTimeout(timer);
  }, [pgn, phase, openings]);

  function changePhase(next: RepertoirePhase) {
    setPhase(next);
    // Opening links only make sense for opening repertoires.
    if (next !== 'opening') setOpeningIds([]);
  }

  function changeOpeningIds(ids: string[]) {
    openingsEdited.current = true;
    setOpeningIds(ids);
  }

  const visibilityCost = REPERTOIRE_VISIBILITY_COST[visibility];

  async function submit() {
    setConfirmOpen(false);
    setPending(true);
    submitError.clear();

    const result = await createRepertoire({
      name,
      description,
      side,
      phase,
      pgn,
      visibility,
      openingIds: phase === 'opening' ? openingIds : [],
      annotations,
      shapes,
    });
    if ('error' in result) {
      setPending(false);
      // An error the form has copy for is shown as itself; anything else (an
      // unexpected server failure) falls back to the generic message. Where it
      // is shown is decided by which control the rejection belongs to.
      const key = `errors.${result.error}`;
      submitError.report(
        repertoireErrorField(result.error, FIELDS),
        t.has(key) ? t(key) : t('errors.generic')
      );
      return;
    }
    // flushSync so the isDirty -> false re-render completes before
    // router.push triggers the navigation guard (same as ChunkForm).
    flushSync(() => setSubmitted(true));
    router.push(`/repertoires/${result.id}`);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // A paid tier confirms the coin charge first; public publishes straight away.
    if (visibilityCost > 0) {
      setConfirmOpen(true);
      return;
    }
    void submit();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="repertoire-name" className="block text-sm font-medium text-foreground">
          {t('form.nameLabel')} <span className="text-destructive">*</span>
        </label>
        <TextInput
          id="repertoire-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('form.namePlaceholder')}
          maxLength={REPERTOIRE_NAME_MAX}
          className="mt-1"
          invalid={nameError !== null}
          {...fieldErrorProps('repertoire-name-error', nameError)}
        />
        <FieldError id="repertoire-name-error" message={nameError} />
      </div>

      <div>
        <label
          htmlFor="repertoire-description"
          className="block text-sm font-medium text-foreground"
        >
          {t('form.descriptionLabel')}
        </label>
        <Textarea
          id="repertoire-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={REPERTOIRE_DESCRIPTION_MAX}
          placeholder={t('form.descriptionPlaceholder')}
          className="mt-1 w-full"
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-foreground">{t('form.sideLabel')}</legend>
        <div className="mt-2 flex gap-4">
          {(['white', 'black'] as const).map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="side"
                value={value}
                checked={side === value}
                onChange={() => setSide(value)}
              />
              {t(`form.side_${value}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="block text-sm font-medium text-foreground">
          {t('form.phaseLabel')}
        </legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {PHASES.map((value) => {
            const locked = !AUTHORABLE_PHASES.includes(value);
            return (
              <label
                key={value}
                className={`flex items-center gap-2 text-sm ${
                  locked ? 'cursor-not-allowed text-muted-foreground' : 'text-foreground'
                }`}
              >
                <input
                  type="radio"
                  name="phase"
                  value={value}
                  checked={phase === value}
                  disabled={locked}
                  onChange={() => changePhase(value)}
                />
                {t(`form.phase_${value}`)}
                {locked && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('form.phaseComingSoon')}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* `id` + `tabIndex` make the whole moves block a focus target: a
          rejection about the moves can land while the board tab is up, where
          there is no textarea to focus. See `submitError` above. */}
      <div
        id="repertoire-moves"
        tabIndex={-1}
        role="group"
        aria-label={t('form.movesLabel')}
        aria-describedby={movesError && inputMode === 'board' ? 'repertoire-pgn-error' : undefined}
        className="space-y-2"
      >
        <span className="block text-sm font-medium text-foreground">
          {t('form.movesLabel')} <span className="text-destructive">*</span>
        </span>
        {/* Same switcher chrome as the chunk / puzzle position editors — here
            the text tab holds a PGN instead of a FEN. */}
        <BoardFenTabs
          activeTab={inputMode === 'board' ? 'board' : 'fen'}
          onTabChange={(tab) => setInputMode(tab === 'board' ? 'board' : 'pgn')}
          boardLabel={t('form.inputModeBoard')}
          fenLabel={t('form.inputModePgn')}
        />
        {inputMode === 'pgn' ? (
          <>
            <p className="text-xs text-muted-foreground">{t('form.pgnHelp')}</p>
            <Textarea
              id="repertoire-pgn"
              value={pgn}
              onChange={(e) => setPgn(e.target.value)}
              placeholder={t('form.pgnPlaceholder')}
              rows={10}
              inputSize="sm"
              className="font-mono"
              aria-label={t('form.pgnLabel')}
              invalid={movesError !== null}
              {...fieldErrorProps('repertoire-pgn-error', movesError)}
            />
          </>
        ) : (
          /* Remounts on each switch, re-importing whatever the pgn state
             holds — so paste → board carries the moves over, and board →
             paste shows the serialized tree in the textarea. */
          <>
            <RepertoireBoardBuilder
              side={side}
              initialPgn={pgn}
              onPgnChange={setPgn}
              onCursorChange={setCursor}
              shapes={shapes}
              onShapesChange={(positionKey, next) =>
                setShapes((prev) => ({ ...prev, [positionKey]: next }))
              }
            />
            {cursor && (
              <MoveAnnotationField
                moveLabel={cursor.label}
                value={annotations[cursor.positionKey] ?? ''}
                onChange={(next) =>
                  setAnnotations((prev) => ({ ...prev, [cursor.positionKey]: next }))
                }
              />
            )}
          </>
        )}
        {/* Outside the mode branch on purpose: board mode is where an
            unreadable PGN is hardest to notice (the builder just shows the
            starting position), so the reason has to be visible there too. It
            doubles as the moves editor's error slot — the submit rejection
            shows here when the live diagnosis has nothing more specific. */}
        <PgnDiagnosisHint pgn={pgn} id="repertoire-pgn-error" fallbackMessage={movesError} />
      </div>

      {phase === 'opening' && (
        <OpeningLinksField
          openings={openings}
          selectedIds={openingIds}
          onChange={changeOpeningIds}
        />
      )}

      <fieldset>
        <legend className="block text-sm font-medium text-foreground">
          {t('visibility.legend')}
        </legend>
        <div className="mt-2 space-y-2">
          {REPERTOIRE_VISIBILITIES.map((value) => {
            const cost = REPERTOIRE_VISIBILITY_COST[value];
            const key = VISIBILITY_I18N_KEY[value];
            return (
              <label key={value} className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="visibility"
                  value={value}
                  checked={visibility === value}
                  onChange={() => setVisibility(value)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">{t(`visibility.${key}`)}</span>
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {cost === 0 ? t('visibility.costFree') : t('visibility.costCoins', { cost })}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t(`visibility.${key}Help`)}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t('visibility.balance', { balance: spendableBalance })}
        </p>
      </fieldset>

      {/* Form-wide errors only — anything attributable to a control is
          rendered against that control instead, so the same sentence never
          appears twice. */}
      <FormErrorBanner ref={submitError.summaryRef} message={submitError.formMessage} />

      <ConfirmationModal
        isOpen={confirmOpen}
        title={t('visibility.confirmTitle')}
        message={
          spendableBalance >= visibilityCost
            ? t('visibility.confirmBody', {
                tier: t(`visibility.${VISIBILITY_I18N_KEY[visibility]}`),
                cost: visibilityCost,
              })
            : t('visibility.confirmInsufficient', {
                cost: visibilityCost,
                balance: spendableBalance,
              })
        }
        confirmText={t('visibility.confirm')}
        cancelText={t('visibility.cancel')}
        isLoading={pending}
        onConfirm={() => void submit()}
        onCancel={() => setConfirmOpen(false)}
      />

      <UnsavedChangesDialog
        open={isBlocking}
        onConfirm={confirm}
        onCancel={cancel}
        title={tUnsaved('title')}
        message={tUnsaved('message')}
        confirmLabel={tUnsaved('confirm')}
        cancelLabel={tUnsaved('cancel')}
      />

      <div className="py-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          icon={<FaPlus />}
          fullWidth
          loading={pending}
        >
          {t('form.submit')}
        </Button>
      </div>
    </form>
  );
}
