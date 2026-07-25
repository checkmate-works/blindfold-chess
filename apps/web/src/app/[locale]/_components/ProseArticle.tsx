import type { ReactNode } from 'react';

type ProseArticleProps = {
  /** Extra classes appended to the shared prose set (e.g. 'space-y-4'). */
  className?: string;
  children: ReactNode;
};

/**
 * Shared typography wrapper for long-form article content
 * (legal pages, articles, announcements, manual, learn).
 *
 * The "Last updated: ..." footnote for legal/static pages is rendered by the
 * dedicated `LastUpdated` component at the bottom of the page body — not here.
 */
export function ProseArticle({ className, children }: ProseArticleProps) {
  return (
    <article
      className={`prose prose-slate dark:prose-invert max-w-none${className ? ` ${className}` : ''}`}
    >
      {children}
    </article>
  );
}
