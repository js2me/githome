import { memo, type CSSProperties, type ReactNode } from "react";
import type { WordDiffSegment } from "@/shared/lib/compute-word-diff";
import { mapTokensToGitlabDiffSyntax } from "@/shared/lib/gitlab/syntax/diff-syntax";
import type { SyntaxToken } from "@/shared/lib/syntax-highlight/shiki-highlighter";
import { renderSearchHighlightedText, type RowSearchHighlightState } from "./diff-search";

const wordChangeClasses = {
  add: "git-diff-inline-added",
  del: "git-diff-inline-removed",
};

const tokenStyle = (token?: SyntaxToken): CSSProperties | undefined => {
  if (!token) return undefined;
  const flags = token.fontStyle ?? 0;
  return {
    color: token.color,
    fontStyle: flags & 1 ? "italic" : undefined,
    fontWeight: flags & 2 ? "bold" : undefined,
    textDecoration: flags & 4 ? "underline" : undefined,
  };
};

export const HighlightedCode = memo(({
  text,
  tokens,
  wordDiffSegments,
  searchHighlight,
}: {
  text: string;
  tokens?: SyntaxToken[] | null;
  wordDiffSegments: WordDiffSegment[] | null;
  searchHighlight: RowSearchHighlightState;
}) => {
  const syntax = tokens && mapTokensToGitlabDiffSyntax(tokens);
  let tokenIndex = 0;
  let wordIndex = 0;
  let tokenEnd = syntax?.[0]?.content.length ?? Infinity;
  let wordEnd = wordDiffSegments?.[0]?.text.length ?? Infinity;

  // Search matches have their own contrast colors. Between them, combine the
  // syntax foreground and the word-diff background at their shared boundaries.
  return renderSearchHighlightedText({ text, ...searchHighlight }, (start, end) => {
    if (!syntax?.length && !wordDiffSegments?.length) return text.slice(start, end);
    const nodes: ReactNode[] = [];
    while (start < end) {
      while (tokenEnd <= start) {
        tokenIndex += 1;
        tokenEnd += syntax?.[tokenIndex]?.content.length ?? Infinity;
      }
      while (wordEnd <= start) {
        wordIndex += 1;
        wordEnd += wordDiffSegments?.[wordIndex]?.text.length ?? Infinity;
      }

      const next = Math.min(end, tokenEnd, wordEnd);
      const token = syntax?.[tokenIndex];
      const wordChange = wordDiffSegments?.[wordIndex]?.highlight;
      const content = text.slice(start, next);
      if (token || wordChange) {
        nodes.push(
          <span
            key={start}
            style={tokenStyle(token)}
            className={wordChange ? wordChangeClasses[wordChange] : undefined}
          >
            {content}
          </span>,
        );
      } else {
        nodes.push(content);
      }
      start = next;
    }
    return nodes;
  });
});
