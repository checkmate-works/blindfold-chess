'use client';

import { useRouter } from '@/i18n/routing';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

import type { Repertoire } from '@/lib/db';

import { ActionsMenu, ActionsMenuButton } from '@/app/[locale]/_components/ActionsMenu';
import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useConfirmAction } from '@/app/[locale]/_hooks/use-confirm-action';

import { deleteRepertoire } from '../_actions/deleteRepertoire';
import { RepertoireLifecycleControls } from './RepertoireLifecycleControls';

type Props = {
  id: string;
  locale: string;
  status: Repertoire['status'];
  /** Live line count — gates publish (see `RepertoireLifecycleControls`). */
  lineCount: number;
};

/**
 * Owner-only "⋯" menu on the repertoire detail page: edit link, publish (while
 * `building`), and delete with a confirmation modal. Rendered only for owners
 * (the page checks `isOwner` server-side). On failure the modal stays open and
 * shows the error.
 */
export function RepertoireActionsMenu({ id, locale, status, lineCount }: Props) {
  const t = useTranslations('Repertoires');
  const router = useRouter();
  const { isOpen, open, cancel, isPending, error, run } = useConfirmAction();

  function handleConfirm() {
    return run(
      () => deleteRepertoire({ id }),
      (result) => ('error' in result ? t('errors.generic') : null),
      () => router.push('/repertoires')
    );
  }

  return (
    <>
      <ActionsMenu
        ariaLabel={t('detail.moreActions')}
        items={[
          {
            key: 'edit',
            label: t('edit.editAction'),
            href: `/${locale}/repertoires/${id}/edit`,
            icon: <FiEdit2 className="h-4 w-4" aria-hidden />,
          },
        ]}
      >
        <RepertoireLifecycleControls
          id={id}
          locale={locale}
          status={status}
          lineCount={lineCount}
        />
        <ActionsMenuButton tone="danger" onClick={open} disabled={isPending}>
          <FiTrash2 className="h-4 w-4" aria-hidden />
          {t('delete.button')}
        </ActionsMenuButton>
      </ActionsMenu>
      <ConfirmationModal
        isOpen={isOpen}
        title={t('delete.title')}
        message={t('delete.message')}
        error={error}
        confirmText={t('delete.confirm')}
        cancelText={t('delete.cancel')}
        confirmVariant="danger"
        isLoading={isPending}
        onConfirm={handleConfirm}
        onCancel={cancel}
      />
    </>
  );
}
