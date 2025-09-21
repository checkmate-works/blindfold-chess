import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { PageTitle } from './PageTitle';

interface MarkdownRendererProps {
  content: string;
  skipFirstH1?: boolean;
}

export function MarkdownRenderer({ content, skipFirstH1 = false }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        h1: ({ children, node }) => {
          // Skip the first h1 if specified (for pages that show title separately)
          if (skipFirstH1 && node?.position?.start?.line === 1) {
            return null;
          }
          return <PageTitle>{children}</PageTitle>;
        },
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold mt-8 mb-4 text-foreground">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-semibold mt-6 mb-3 text-foreground">{children}</h3>
        ),
        p: ({ children }) => {
          // Check if children contains an img element
          if (
            Array.isArray(children) &&
            children.some((child) => child?.type?.name === 'img' || child?.props?.mdxType === 'img')
          ) {
            return <>{children}</>;
          }
          return <p className="mb-4 text-foreground/90">{children}</p>;
        },
        ul: ({ children }) => <ul className="list-disc mb-4 ml-6 space-y-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal mb-4 ml-6 space-y-2">{children}</ol>,
        li: ({ children }) => <li className="text-foreground/90 pl-2">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline hover:opacity-80"
          >
            {children}
          </a>
        ),
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
          <pre className="bg-secondary p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-border pl-4 py-2 my-6 bg-secondary/50 text-foreground/90 italic">
            {children}
          </blockquote>
        ),
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="rounded-lg shadow-md max-w-full mx-auto block my-8" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
