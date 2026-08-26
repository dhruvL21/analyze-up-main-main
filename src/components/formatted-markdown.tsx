'use client';

import React from 'react';

interface FormattedMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Parses inline markdown tokens like **bold**, *italic*, `code`, etc.
 */
function parseInlineMarkdown(text: string): React.ReactNode[] {
  // Regex to match **bold**, *italic*, `code`
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Match **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Match *italic*
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);
    // Match `code`
    const codeMatch = remaining.match(/`([^`]+?)`/);

    let firstMatchIndex = Infinity;
    let matchType: 'bold' | 'italic' | 'code' | null = null;
    let matchResult: RegExpMatchArray | null = null;

    if (boldMatch && boldMatch.index !== undefined && boldMatch.index < firstMatchIndex) {
      firstMatchIndex = boldMatch.index;
      matchType = 'bold';
      matchResult = boldMatch;
    }
    if (italicMatch && italicMatch.index !== undefined && italicMatch.index < firstMatchIndex) {
      firstMatchIndex = italicMatch.index;
      matchType = 'italic';
      matchResult = italicMatch;
    }
    if (codeMatch && codeMatch.index !== undefined && codeMatch.index < firstMatchIndex) {
      firstMatchIndex = codeMatch.index;
      matchType = 'code';
      matchResult = codeMatch;
    }

    if (matchType && matchResult && matchResult.index !== undefined) {
      // Add preceding plain text (cleaning any stray asterisks or hashes)
      if (matchResult.index > 0) {
        const plain = remaining.substring(0, matchResult.index).replace(/[*#]/g, '');
        if (plain) {
          tokens.push(<span key={`plain-${keyIndex++}`}>{plain}</span>);
        }
      }

      // Add matched token
      if (matchType === 'bold') {
        const innerText = matchResult[1];
        // If it looks like a label e.g. "WHAT:", "WHY:", "RECOMMENDED ACTION:", give special highlight
        const isLabel = /^[A-Z0-9\s_/-]+:$/.test(innerText.trim());
        tokens.push(
          <strong
            key={`bold-${keyIndex++}`}
            className={isLabel ? 'font-bold text-primary font-mono text-[11px] tracking-wide' : 'font-bold text-foreground'}
          >
            {innerText}
          </strong>
        );
      } else if (matchType === 'italic') {
        tokens.push(
          <em key={`italic-${keyIndex++}`} className="italic text-muted-foreground">
            {matchResult[1]}
          </em>
        );
      } else if (matchType === 'code') {
        tokens.push(
          <code
            key={`code-${keyIndex++}`}
            className="px-1 py-0.5 rounded bg-secondary/80 text-foreground font-mono text-[11px] border border-border/40"
          >
            {matchResult[1]}
          </code>
        );
      }

      remaining = remaining.substring(matchResult.index + matchResult[0].length);
    } else {
      // No more tokens, push remainder stripped of stray asterisks or hashes
      const plain = remaining.replace(/[*#]/g, '');
      if (plain) {
        tokens.push(<span key={`plain-${keyIndex++}`}>{plain}</span>);
      }
      break;
    }
  }

  return tokens;
}

export function FormattedMarkdown({ content, className = '' }: FormattedMarkdownProps) {
  if (!content) return null;

  // Split into lines for block-level parsing
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentList: { text: string; key: string }[] = [];
  let blockIndex = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      const listItems = [...currentList];
      currentList = [];
      blocks.push(
        <ul key={`list-${blockIndex++}`} className="space-y-1.5 my-2 pl-1">
          {listItems.map((item) => (
            <li key={item.key} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/80 mt-1.5 shrink-0" />
              <div className="flex-1">{parseInlineMarkdown(item.text)}</div>
            </li>
          ))}
        </ul>
      );
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Match H1 (# Header)
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      flushList();
      const text = trimmed.replace(/^#+\s*/, '').replace(/[*#]/g, '');
      blocks.push(
        <h3 key={`h1-${blockIndex++}`} className="text-sm font-extrabold text-foreground tracking-tight pt-2 pb-1 border-b border-border/40">
          {text}
        </h3>
      );
      continue;
    }

    // Match H2 (## Header)
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      flushList();
      const text = trimmed.replace(/^#+\s*/, '').replace(/[*#]/g, '');
      blocks.push(
        <h4 key={`h2-${blockIndex++}`} className="text-xs font-bold text-foreground uppercase tracking-wider pt-2 pb-0.5 text-primary">
          {text}
        </h4>
      );
      continue;
    }

    // Match H3 (### Header) or H4 (#### Header)
    if (trimmed.startsWith('### ') || trimmed.startsWith('#### ') || trimmed.startsWith('##### ')) {
      flushList();
      const text = trimmed.replace(/^#+\s*/, '').replace(/[*#]/g, '');
      blocks.push(
        <div key={`h3-${blockIndex++}`} className="pt-2 pb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
            {text}
          </span>
        </div>
      );
      continue;
    }

    // Match Unordered List Item (- item or * item)
    if (/^[-*]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*]\s+/, '');
      currentList.push({ text: itemText, key: `item-${i}` });
      continue;
    }

    // Match Numbered List Item (1. item)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numMatch) {
      flushList();
      blocks.push(
        <div key={`num-${blockIndex++}`} className="flex items-start gap-2 text-xs leading-relaxed my-1.5 pl-1">
          <span className="w-4 h-4 rounded-full bg-secondary text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-border/50">
            {numMatch[1]}
          </span>
          <div className="flex-1">{parseInlineMarkdown(numMatch[2])}</div>
        </div>
      );
      continue;
    }

    // Regular Paragraph Line
    flushList();
    blocks.push(
      <p key={`p-${blockIndex++}`} className="text-xs leading-relaxed text-foreground/90 my-1">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
}
