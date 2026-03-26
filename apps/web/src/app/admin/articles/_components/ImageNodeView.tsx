'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import { LuAlignCenter, LuAlignLeft, LuAlignRight } from 'react-icons/lu';

type ImageSize = 'large' | 'small';
type ImageAlign = 'left' | 'center' | 'right';

export function ImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const [showToggle, setShowToggle] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const size: ImageSize = (node.attrs.size as ImageSize) ?? 'large';
  const align: ImageAlign = (node.attrs.align as ImageAlign) ?? 'center';
  const isPlaceholder = node.attrs.class?.includes('tiptap-image-placeholder');

  const handleClick = useCallback(() => {
    if (!isPlaceholder) {
      setShowToggle(true);
    }
  }, [isPlaceholder]);

  // Close toggle when clicking outside
  useEffect(() => {
    if (!showToggle) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowToggle(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showToggle]);

  // Also show toggle when node is selected via keyboard
  useEffect(() => {
    if (selected && !isPlaceholder) {
      setShowToggle(true);
    } else if (!selected) {
      setShowToggle(false);
    }
  }, [selected, isPlaceholder]);

  const sizeClass = size === 'small' ? 'tiptap-image-small' : 'tiptap-image-large';
  const alignClass = `tiptap-image-align-${align}`;

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      className={`tiptap-image-node ${sizeClass} ${alignClass}`}
      data-size={size}
      data-align={align}
    >
      <img
        src={node.attrs.src}
        alt={node.attrs.alt ?? ''}
        title={node.attrs.title ?? undefined}
        className={node.attrs.class ?? ''}
        width={node.attrs.width ?? undefined}
        height={node.attrs.height ?? undefined}
        onClick={handleClick}
        draggable={false}
      />
      {showToggle && !isPlaceholder && (
        <div className="tiptap-image-toolbar">
          {/* Size toggle */}
          <div className="tiptap-image-toggle-group">
            <button
              type="button"
              className={`tiptap-image-toggle-btn ${size === 'large' ? 'tiptap-image-toggle-btn-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => updateAttributes({ size: 'large' })}
              title="大"
            >
              大
            </button>
            <button
              type="button"
              className={`tiptap-image-toggle-btn ${size === 'small' ? 'tiptap-image-toggle-btn-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => updateAttributes({ size: 'small' })}
              title="小"
            >
              小
            </button>
          </div>

          <div className="tiptap-image-toolbar-divider" />

          {/* Alignment toggle */}
          <div className="tiptap-image-toggle-group">
            <button
              type="button"
              className={`tiptap-image-toggle-btn ${align === 'left' ? 'tiptap-image-toggle-btn-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => updateAttributes({ align: 'left' })}
              title="左揃え"
            >
              <LuAlignLeft size={14} />
            </button>
            <button
              type="button"
              className={`tiptap-image-toggle-btn ${align === 'center' ? 'tiptap-image-toggle-btn-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => updateAttributes({ align: 'center' })}
              title="中央揃え"
            >
              <LuAlignCenter size={14} />
            </button>
            <button
              type="button"
              className={`tiptap-image-toggle-btn ${align === 'right' ? 'tiptap-image-toggle-btn-active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => updateAttributes({ align: 'right' })}
              title="右揃え"
            >
              <LuAlignRight size={14} />
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
