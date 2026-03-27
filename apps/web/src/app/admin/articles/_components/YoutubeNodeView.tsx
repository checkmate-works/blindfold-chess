'use client';

import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';

import { extractYouTubeVideoId } from '../_lib/youtube';

export function YoutubeNodeView({ node }: NodeViewProps) {
  const src = node.attrs.src as string | null;

  if (!src) {
    return (
      <NodeViewWrapper data-youtube-video="">
        <div className="tiptap-youtube-empty">YouTube動画（URL未設定）</div>
      </NodeViewWrapper>
    );
  }

  const videoId = extractYouTubeVideoId(src);

  if (!videoId) {
    return (
      <NodeViewWrapper data-youtube-video="">
        <div className="tiptap-youtube-empty">YouTube: 無効なURL</div>
      </NodeViewWrapper>
    );
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

  return (
    <NodeViewWrapper data-youtube-video="" className="tiptap-youtube-wrapper">
      <iframe
        src={embedUrl}
        width={node.attrs.width || 640}
        height={node.attrs.height || 480}
        allowFullScreen
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        title="YouTube video"
      />
    </NodeViewWrapper>
  );
}
