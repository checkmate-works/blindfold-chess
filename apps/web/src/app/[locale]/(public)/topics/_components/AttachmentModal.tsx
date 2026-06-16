'use client';

import { type KeyboardEvent, useCallback, useId, useState } from 'react';

import { Button } from '@/app/_components';

import { AttachmentInput } from '@/app/[locale]/(public)/topics/_components/AttachmentInput';
import type {
  AttachmentInputMode,
  ValidationStatus,
} from '@/app/[locale]/(public)/topics/_components/AttachmentInput';
import { FenAttachmentInput } from '@/app/[locale]/(public)/topics/_components/FenAttachmentInput';
import type { FenAttachmentMode } from '@/app/[locale]/(public)/topics/_components/FenAttachmentInput';
import { ImageAttachmentInput } from '@/app/[locale]/(public)/topics/_components/ImageAttachmentInput';
import type { ImageAttachmentMode } from '@/app/[locale]/(public)/topics/_components/ImageAttachmentInput';
import { Modal } from '@/app/[locale]/_components/Modal';

/**
 * @design Single-kind constraint
 *
 * SPEC2 D3 case (iii): a post may carry attachments from at most one
 * family. Each tab owns one sub-kind (Game = pgn, Position = fen,
 * Images = image). The user picks the active tab and only that tab's
 * mode is forwarded to the parent at submit time. Tab state persists
 * across switches so a user can compare drafts without losing work, but
 * only the active tab's attachment is committed — the structural
 * guarantee replaces the previous bothFamiliesActive warning.
 *
 * @design Image attachments (still images only)
 *
 * The Images tab re-uses the 2-step upload flow: the parent form
 * synthesises the post, then POSTs each selected file to
 * `/api/posts/[id]/images`. Video is intentionally not offered. Existing
 * video / embed rows stored before the pre-release scope reduction (#84)
 * still render via the topic post detail components — only their input
 * UI stays retired.
 */
export type AttachmentTabKind = 'game' | 'position' | 'image';

/**
 * Aggregated mode emitted on submit.
 *
 * Each branch maps to one of the supported attachment kinds (`pgn`,
 * `fen`, `image`) plus an `empty` no-attachment shape. Submitting
 * `empty` posts a plain comment with no attachment row — that path
 * stays valid because the parent form falls back to the plain `pgn`
 * action for the empty case.
 */
export type AggregatedAttachmentMode =
  | { kind: 'empty' }
  | { kind: 'pgn'; pgn: string; anonymize: boolean }
  | { kind: 'fen'; fen: string; caption: string | null; valid: boolean }
  | { kind: 'image'; files: readonly File[] };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called when the user clicks the modal's "Apply" button. The parent
   * form is responsible for routing the aggregated mode into the right
   * Server Action.
   */
  onApply: (mode: AggregatedAttachmentMode) => void;
};

const TABS: readonly { key: AttachmentTabKind; label: string }[] = [
  // TODO(i18n): attachment.modal.tab.game
  { key: 'game', label: 'Game' },
  // TODO(i18n): attachment.modal.tab.position
  { key: 'position', label: 'Position' },
  // TODO(i18n): attachment.modal.tab.image
  { key: 'image', label: 'Images' },
];

export function AttachmentModal({ isOpen, onClose, onApply }: Props) {
  const titleId = useId();
  const tabIdPrefix = useId();
  const [activeTab, setActiveTab] = useState<AttachmentTabKind>('game');

  // Each tab keeps its own state so switching tabs does not lose the
  // user's in-progress draft. Only the active tab's mode is surfaced
  // on submit.
  const [gameMode, setGameMode] = useState<AttachmentInputMode>({ kind: 'empty' });
  const [positionMode, setPositionMode] = useState<FenAttachmentMode>({ kind: 'empty' });
  const [imageMode, setImageMode] = useState<ImageAttachmentMode>({ kind: 'empty' });

  const onGameModeChange = useCallback((mode: AttachmentInputMode) => setGameMode(mode), []);
  const onPositionModeChange = useCallback((mode: FenAttachmentMode) => setPositionMode(mode), []);
  const onImageModeChange = useCallback((mode: ImageAttachmentMode) => setImageMode(mode), []);

  // Per-tab validation status. Apply is disabled when the *active* tab
  // is in `error`. Inactive tabs' errors do not block Apply because
  // only the active tab's mode is committed (single-kind D3 guarantee).
  const [gameStatus, setGameStatus] = useState<ValidationStatus>('empty');
  const [positionStatus, setPositionStatus] = useState<ValidationStatus>('empty');
  const [imageStatus, setImageStatus] = useState<ValidationStatus>('empty');

  const onGameStatusChange = useCallback((s: ValidationStatus) => setGameStatus(s), []);
  const onPositionStatusChange = useCallback((s: ValidationStatus) => setPositionStatus(s), []);
  const onImageStatusChange = useCallback((s: ValidationStatus) => setImageStatus(s), []);

  const aggregated: AggregatedAttachmentMode =
    activeTab === 'game' ? gameMode : activeTab === 'position' ? positionMode : imageMode;

  const activeStatus: ValidationStatus =
    activeTab === 'game' ? gameStatus : activeTab === 'position' ? positionStatus : imageStatus;

  // Apply is blocked whenever the active tab has a known-bad input.
  // The legacy `aggregated.kind === 'fen' && !aggregated.valid` guard
  // is now subsumed by `activeStatus === 'error'` because
  // FenAttachmentInput emits `'error'` whenever `fenValid === false`.
  const applyDisabled = activeStatus === 'error';

  const handleApply = useCallback(() => {
    if (applyDisabled) return;
    onApply(aggregated);
    onClose();
  }, [applyDisabled, aggregated, onApply, onClose]);

  // Roving tab navigation per W3C ARIA APG.
  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = (currentIndex - 1 + TABS.length) % TABS.length;
      setActiveTab(TABS[next].key);
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (currentIndex + 1) % TABS.length;
      setActiveTab(TABS[next].key);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setActiveTab(TABS[0].key);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setActiveTab(TABS[TABS.length - 1].key);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      trapFocus
      fullHeightOnMobile
      keepMounted
      aria-labelledby={titleId}
    >
      <div className="flex h-full flex-col sm:h-[500px]">
        <h2 id={titleId} className="text-xl font-semibold text-foreground">
          {/* TODO(i18n): attachment.modal.title */}
          Attach to your post
        </h2>

        {/* Tab list */}
        <div
          role="tablist"
          aria-label="Attachment kind"
          className="sticky top-0 z-10 mt-4 flex gap-1 border-b border-border bg-card pt-1"
        >
          {TABS.map((tab, index) => {
            const isActive = activeTab === tab.key;
            const tabId = `${tabIdPrefix}-tab-${tab.key}`;
            const panelId = `${tabIdPrefix}-panel-${tab.key}`;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={tabId}
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                  isActive
                    ? 'border-primary text-foreground font-medium'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab panels */}
        <div className="mt-4 flex-1 overflow-y-auto">
          <div
            role="tabpanel"
            id={`${tabIdPrefix}-panel-game`}
            aria-labelledby={`${tabIdPrefix}-tab-game`}
            hidden={activeTab !== 'game'}
          >
            <AttachmentInput
              onModeChange={onGameModeChange}
              onValidationStatusChange={onGameStatusChange}
            />
          </div>
          <div
            role="tabpanel"
            id={`${tabIdPrefix}-panel-position`}
            aria-labelledby={`${tabIdPrefix}-tab-position`}
            hidden={activeTab !== 'position'}
          >
            <FenAttachmentInput
              onModeChange={onPositionModeChange}
              onValidationStatusChange={onPositionStatusChange}
            />
          </div>
          <div
            role="tabpanel"
            id={`${tabIdPrefix}-panel-image`}
            aria-labelledby={`${tabIdPrefix}-tab-image`}
            hidden={activeTab !== 'image'}
          >
            <ImageAttachmentInput
              onModeChange={onImageModeChange}
              onValidationStatusChange={onImageStatusChange}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 mt-4 flex justify-end gap-2 border-t border-border bg-card pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            {/* TODO(i18n): attachment.modal.cancel */}
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleApply} disabled={applyDisabled}>
            {/* TODO(i18n): attachment.modal.apply */}
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
}
