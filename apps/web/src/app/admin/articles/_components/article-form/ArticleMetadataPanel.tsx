'use client';

import { fieldErrorProps } from '@/app/_components/FieldError';
import { Field, Input, Select, Textarea } from '@/app/admin/_components/forms';
import { LuX } from 'react-icons/lu';

type ArticleMetadataPanelLabels = {
  metadata: string;
  category: string;
  categoryNone: string;
  excerpt: string;
  excerptPlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  icon: string;
  iconPlaceholder: string;
};

type ArticleMetadataPanelProps = {
  labels: ArticleMetadataPanelLabels;
  categories: { id: string; name: string }[];
  categoryId: string;
  excerpt: string;
  description: string;
  icon: string;
  onCategoryIdChange: (value: string) => void;
  onExcerptChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onIconChange: (value: string) => void;
  /** A save rejection about the icon, shown at the icon input. */
  iconError?: string | null;
  onClose: () => void;
};

export function ArticleMetadataPanel({
  labels,
  categories,
  categoryId,
  excerpt,
  description,
  icon,
  onCategoryIdChange,
  onExcerptChange,
  onDescriptionChange,
  onIconChange,
  iconError = null,
  onClose,
}: ArticleMetadataPanelProps) {
  return (
    <div className="w-80 border-l border-border overflow-y-auto shrink-0">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{labels.metadata}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close metadata"
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LuX size={16} />
          </button>
        </div>

        <Field label={labels.category} htmlFor="categoryId">
          <Select
            id="categoryId"
            value={categoryId}
            onChange={(e) => onCategoryIdChange(e.target.value)}
          >
            <option value="">{labels.categoryNone}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={labels.excerpt} htmlFor="excerpt">
          <Textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => onExcerptChange(e.target.value)}
            placeholder={labels.excerptPlaceholder}
            className="resize-none"
            rows={3}
          />
        </Field>

        <Field label={labels.description} htmlFor="description">
          <Textarea
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={labels.descriptionPlaceholder}
            className="resize-none"
            rows={3}
          />
        </Field>

        <Field label={labels.icon} htmlFor="icon" error={iconError}>
          <Input
            id="icon"
            type="text"
            value={icon}
            onChange={(e) => onIconChange(e.target.value)}
            placeholder={labels.iconPlaceholder}
            maxLength={10}
            invalid={iconError !== null}
            {...fieldErrorProps('icon-error', iconError)}
          />
        </Field>
      </div>
    </div>
  );
}
