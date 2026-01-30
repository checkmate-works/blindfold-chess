import Link from 'next/link';

import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { ChessBoardDemo } from './ChessBoardDemo';
import { PageTitle } from './PageTitle';
import { SectionTitle } from './SectionTitle';
import { SubsectionTitle } from './SubsectionTitle';

type Props = {
  content: string;
  skipFirstH1?: boolean;
};

export function MarkdownRenderer({ content, skipFirstH1 = false }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        h1: ({ children, node }) => {
          if (skipFirstH1 && node?.position?.start?.line === 1) {
            return null;
          }
          return <PageTitle>{children}</PageTitle>;
        },
        h2: ({ children }) => <SectionTitle className="mb-4 mt-10">{children}</SectionTitle>,
        h3: ({ children }) => <SubsectionTitle className="mb-3 mt-8">{children}</SubsectionTitle>,
        p: ({ children, node }) => {
          // Check if paragraph contains only an image (including demo components)
          // This prevents <div> inside <p> hydration errors
          const hasOnlyImage =
            node?.children?.length === 1 &&
            node?.children[0]?.type === 'element' &&
            node?.children[0]?.tagName === 'img';
          if (hasOnlyImage) {
            return <>{children}</>;
          }
          return <p className="text-foreground/90 leading-relaxed mb-6">{children}</p>;
        },
        ul: ({ children }) => <ul className="list-disc ml-6 space-y-2 mb-6">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal ml-6 space-y-2 mb-6">{children}</ol>,
        li: ({ children }) => (
          <li className="text-foreground/90 pl-2 leading-relaxed">{children}</li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
        a: ({ href, children }) => {
          const isInternalLink = href?.startsWith('/') || href?.startsWith('#');
          if (isInternalLink) {
            return (
              <Link
                href={href || ''}
                className="text-primary no-underline hover:underline transition-all"
              >
                {children}
              </Link>
            );
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary no-underline hover:underline transition-all"
            >
              {children}
            </a>
          );
        },
        code: ({ children, className }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            );
          }
          return <code className={className}>{children}</code>;
        },
        pre: ({ children }) => (
          <pre className="bg-secondary p-4 rounded-md overflow-x-auto">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-border pl-4 py-2 my-6 bg-secondary/50 text-foreground/90 italic">
            {children}
          </blockquote>
        ),
        img: ({ src, alt }) => {
          // Handle demo: prefix for interactive ChessBoard demos
          // In markdown ![demo:type](), the demo type is in the alt text
          if (alt?.startsWith('demo:')) {
            const demoType = alt.replace('demo:', '') as
              | 'board-normal'
              | 'single-colored'
              | 'stones';
            return <ChessBoardDemo type={demoType} />;
          }
          if (!src) return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt}
              className={`rounded-md shadow-md mx-auto block my-8 ${
                src.endsWith('.svg') ? 'w-full max-w-sm' : 'max-w-full'
              }`}
            />
          );
        },
        table: ({ children }) => (
          <div className="overflow-x-auto my-6">
            <table className="min-w-full border-collapse border border-border">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-secondary">{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
        th: ({ children }) => (
          <th className="px-4 py-2 text-left font-medium text-foreground border border-border">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 text-foreground/90 border border-border">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
