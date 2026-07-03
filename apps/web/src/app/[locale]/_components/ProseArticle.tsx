import type { ReactNode } from 'react';

type ProseArticleProps = {
  /**
   * The localized "Last updated: ..." line rendered muted at the top.
   * Used by the legal/static pages; content pages omit it.
   */
  lastUpdated?: string;
  /** Extra classes appended to the shared prose set (e.g. 'space-y-4'). */
  className?: string;
  children: ReactNode;
};

/**
 * Shared typography wrapper for long-form article content
 * (legal pages, articles, announcements, manual, learn).
 */
export function ProseArticle({ lastUpdated, className, children }: ProseArticleProps) {
  return (
    <article
      className={`prose prose-slate dark:prose-invert max-w-none${className ? ` ${className}` : ''}`}
    >
      {lastUpdated !== undefined && <p className="text-muted-foreground">{lastUpdated}</p>}
      {children}
    </article>
  );
}
