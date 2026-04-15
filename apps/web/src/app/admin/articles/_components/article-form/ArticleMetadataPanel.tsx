'use client';

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

        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium mb-1">
            {labels.category}
          </label>
          <select
            id="categoryId"
            value={categoryId}
            onChange={(e) => onCategoryIdChange(e.target.value)}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground"
          >
            <option value="">{labels.categoryNone}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium mb-1">
            {labels.excerpt}
          </label>
          <textarea
            id="excerpt"
            value={excerpt}
            onChange={(e) => onExcerptChange(e.target.value)}
            placeholder={labels.excerptPlaceholder}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground resize-none"
            rows={3}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            {labels.description}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={labels.descriptionPlaceholder}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground resize-none"
            rows={3}
          />
        </div>

        <div>
          <label htmlFor="icon" className="block text-sm font-medium mb-1">
            {labels.icon}
          </label>
          <input
            id="icon"
            type="text"
            value={icon}
            onChange={(e) => onIconChange(e.target.value)}
            placeholder={labels.iconPlaceholder}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground"
            maxLength={10}
          />
        </div>
      </div>
    </div>
  );
}

export type { ArticleMetadataPanelLabels };
