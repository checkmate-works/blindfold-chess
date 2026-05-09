'use client';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';

import { BoardThumbnail } from '@/lib/positions/ui/BoardThumbnail';

import { Modal } from '@/app/[locale]/_components/Modal';

import type { ChunkOption, ThemeOption } from '../_lib/load-puzzle-tags';

export type TagDetailItem = ({ kind: 'theme' } & ThemeOption) | ({ kind: 'chunk' } & ChunkOption);

type Props = {
  item: TagDetailItem | null;
  onClose: () => void;
  onDetach: (item: TagDetailItem) => void;
  labels: {
    badgeTheme: string;
    badgeChunk: string;
    readingPrefix: string;
    noDescription: string;
    viewInGlossary: string;
    viewChunkPage: string;
    detach: string;
    close: string;
  };
};

export function TagDetailModal({ item, onClose, onDetach, labels }: Props) {
  if (!item) return null;

  const isTheme = item.kind === 'theme';
  const detail = isTheme ? item.definition : item.description;

  return (
    <Modal isOpen={true} onClose={onClose} title={item.label} maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Sub-header: kind badge + (theme: category, reading) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 ${
              isTheme ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {isTheme ? labels.badgeTheme : labels.badgeChunk}
          </span>
          {isTheme && item.category && (
            <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
          )}
          {isTheme && item.reading && (
            <span className="text-xs text-muted-foreground">
              {labels.readingPrefix}
              {item.reading}
            </span>
          )}
        </div>

        {/* Boards */}
        {isTheme ? (
          item.positions.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center">
              {item.positions.map((pos, i) => (
                <div
                  key={`${pos.fen}-${i}`}
                  className="flex flex-col items-center gap-1 max-w-[12rem]"
                >
                  <BoardThumbnail fen={pos.fen} className="w-40 h-40" />
                  {pos.caption && (
                    <p className="text-xs text-muted-foreground text-center">{pos.caption}</p>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex justify-center">
            <BoardThumbnail fen={item.representativeFen} className="w-48 h-48" />
          </div>
        )}

        {/* Description / definition */}
        <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">
          {detail && detail.trim().length > 0 ? detail : labels.noDescription}
        </p>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end pt-3 border-t border-border">
          <Link
            href={isTheme ? `/glossary/${item.slug}` : `/chunks/${item.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 text-sm rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {isTheme ? labels.viewInGlossary : labels.viewChunkPage}
          </Link>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onDetach(item);
              onClose();
            }}
          >
            {labels.detach}
          </Button>
          <Button type="button" variant="primary" onClick={onClose}>
            {labels.close}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
