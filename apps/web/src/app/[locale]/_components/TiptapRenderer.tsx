import Image from 'next/image';
import Link from 'next/link';

import type { TiptapJsonContent, TiptapMark, TiptapNode } from '@/app/admin/articles/_lib/types';
import { extractYouTubeVideoId } from '@/app/admin/articles/_lib/youtube';
import { Tweet } from 'react-tweet';

import { SectionTitle } from './SectionTitle';
import { SubsectionTitle } from './SubsectionTitle';
import './tiptap-renderer.css';

type Props = {
  content: TiptapJsonContent;
};

/**
 * Lightweight Tiptap JSON renderer for public article pages.
 *
 * Recursively traverses the Tiptap JSON document and maps each node type
 * to a React element. Does NOT import any Tiptap editor code, keeping
 * the bundle size minimal for readers.
 */
export function TiptapRenderer({ content }: Props) {
  return (
    <article className="tiptap-renderer">
      {content.content?.map((node, i) => (
        <RenderNode key={i} node={node} />
      ))}
    </article>
  );
}

function RenderNode({ node }: { node: TiptapNode }) {
  switch (node.type) {
    case 'heading':
      return <HeadingNode node={node} />;
    case 'paragraph':
      return <ParagraphNode node={node} />;
    case 'bulletList':
      return (
        <ul className="list-disc ml-6 space-y-2 mb-6">
          <RenderChildren node={node} />
        </ul>
      );
    case 'orderedList':
      return (
        <ol className="list-decimal ml-6 space-y-2 mb-6">
          <RenderChildren node={node} />
        </ol>
      );
    case 'listItem':
      return (
        <li className="text-foreground/90 pl-2 leading-relaxed">
          <RenderChildren node={node} />
        </li>
      );
    case 'blockquote':
      return (
        <blockquote className="border-l-4 border-border pl-4 py-2 my-6 bg-secondary/50 text-foreground/90 italic">
          <RenderChildren node={node} />
        </blockquote>
      );
    case 'codeBlock':
      return (
        <pre className="bg-secondary p-4 rounded-md overflow-x-auto">
          <code className="text-sm font-mono">
            <RenderInlineContent node={node} />
          </code>
        </pre>
      );
    case 'horizontalRule':
      return <hr className="border-t border-border my-8" />;
    case 'image':
      return <ImageNode node={node} />;
    case 'youtube':
      return <YouTubeNode node={node} />;
    case 'twitterEmbed':
      return <XEmbedNode node={node} />;
    default:
      // Fallback: render children if any, ignore unknown nodes
      if (node.content) {
        return <RenderChildren node={node} />;
      }
      return null;
  }
}

function RenderChildren({ node }: { node: TiptapNode }) {
  if (!node.content) return null;
  return (
    <>
      {node.content.map((child, i) => (
        <RenderNode key={i} node={child} />
      ))}
    </>
  );
}

function HeadingNode({ node }: { node: TiptapNode }) {
  const level = (node.attrs?.level as number) ?? 2;
  const children = <RenderInlineContent node={node} />;

  if (level === 2) {
    return <SectionTitle className="mb-4 mt-10 first:mt-0">{children}</SectionTitle>;
  }
  if (level === 3) {
    return <SubsectionTitle className="mb-3 mt-8">{children}</SubsectionTitle>;
  }
  // Fallback for other heading levels
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  return <Tag>{children}</Tag>;
}

function ParagraphNode({ node }: { node: TiptapNode }) {
  if (!node.content || node.content.length === 0) {
    return <p className="text-foreground/90 leading-relaxed mb-6">&nbsp;</p>;
  }
  return (
    <p className="text-foreground/90 leading-relaxed mb-6">
      <RenderInlineContent node={node} />
    </p>
  );
}

function RenderInlineContent({ node }: { node: TiptapNode }) {
  if (!node.content) return null;
  return (
    <>
      {node.content.map((child, i) => {
        if (child.type === 'text') {
          return <RenderText key={i} node={child} />;
        }
        // Inline nodes that aren't text (e.g., hardBreak)
        if (child.type === 'hardBreak') {
          return <br key={i} />;
        }
        return null;
      })}
    </>
  );
}

function RenderText({ node }: { node: TiptapNode }) {
  if (!node.text) return null;

  let element: React.ReactNode = node.text;

  if (node.marks) {
    for (const mark of node.marks) {
      element = applyMark(element, mark);
    }
  }

  return <>{element}</>;
}

function applyMark(children: React.ReactNode, mark: TiptapMark): React.ReactNode {
  switch (mark.type) {
    case 'bold':
      return <strong className="font-semibold text-foreground">{children}</strong>;
    case 'italic':
      return <em className="italic text-foreground/90">{children}</em>;
    case 'strike':
      return <s>{children}</s>;
    case 'code':
      return (
        <code className="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
      );
    case 'link': {
      const href = (mark.attrs?.href as string) ?? '';
      const isSafeUrl =
        href.startsWith('/') ||
        href.startsWith('#') ||
        href.startsWith('http://') ||
        href.startsWith('https://');
      if (!isSafeUrl) {
        return children;
      }
      const isInternal = href.startsWith('/') || href.startsWith('#');
      if (isInternal) {
        return (
          <Link href={href} className="text-primary no-underline hover:underline transition-all">
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
    }
    default:
      return children;
  }
}

function ImageNode({ node }: { node: TiptapNode }) {
  const src = node.attrs?.src as string | undefined;
  const alt = (node.attrs?.alt as string) ?? '';
  const size = (node.attrs?.size as string) ?? 'large';
  const align = (node.attrs?.align as string) ?? 'center';

  if (!src) return null;

  const sizeClass = size === 'small' ? 'tiptap-render-image-small' : 'tiptap-render-image-large';
  const alignClass =
    align === 'left'
      ? 'tiptap-render-image-align-left'
      : align === 'right'
        ? 'tiptap-render-image-align-right'
        : 'tiptap-render-image-align-center';

  return (
    <figure className={`tiptap-render-image ${sizeClass} ${alignClass}`}>
      <Image
        src={src}
        alt={alt}
        width={size === 'small' ? 400 : 800}
        height={size === 'small' ? 300 : 600}
        unoptimized
        className="rounded-md object-contain"
        sizes={size === 'small' ? '400px' : '(max-width: 768px) 100vw, 800px'}
      />
    </figure>
  );
}

function YouTubeNode({ node }: { node: TiptapNode }) {
  const src = node.attrs?.src as string | undefined;
  if (!src) return null;

  const videoId = extractYouTubeVideoId(src);
  if (!videoId) return null;

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

  return (
    <div className="tiptap-render-youtube">
      <iframe
        src={embedUrl}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function XEmbedNode({ node }: { node: TiptapNode }) {
  const tweetId = node.attrs?.tweetId as string | undefined;

  if (!tweetId) {
    // Fallback: render as a link if we only have URL
    const url = node.attrs?.url as string | undefined;
    if (!url) return null;
    return (
      <div className="tiptap-render-tweet-fallback">
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      </div>
    );
  }

  return (
    <div className="tiptap-render-tweet">
      <Tweet id={tweetId} />
    </div>
  );
}
