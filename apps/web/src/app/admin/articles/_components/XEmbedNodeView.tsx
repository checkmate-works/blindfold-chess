'use client';

import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';

import { extractXUsername } from '../_lib/x-utils';

export function XEmbedNodeView({ node }: NodeViewProps) {
  const url = node.attrs.url as string | null;
  const tweetId = node.attrs.tweetId as string | null;

  if (!url && !tweetId) {
    return (
      <NodeViewWrapper>
        <div className="tiptap-x-embed-empty">X 埋め込み（URL未設定）</div>
      </NodeViewWrapper>
    );
  }

  const username = url ? extractXUsername(url) : null;

  const displayUrl = url ?? `https://x.com/i/status/${tweetId}`;

  return (
    <NodeViewWrapper>
      <div className="tiptap-x-embed-card">
        <div className="tiptap-x-embed-card-header">
          <span className="tiptap-x-embed-card-icon">𝕏</span>
          <span className="tiptap-x-embed-card-label">Post from X</span>
        </div>
        <div className="tiptap-x-embed-card-body">
          {username && <span className="tiptap-x-embed-card-username">@{username}</span>}
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="tiptap-x-embed-card-url"
          >
            {displayUrl}
          </a>
        </div>
        <div className="tiptap-x-embed-card-footer">配信ページではポストの内容が表示されます</div>
      </div>
    </NodeViewWrapper>
  );
}
