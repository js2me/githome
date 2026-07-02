import { memo, useMemo } from "react";
import { mapTokensToGitlabDiffSyntax } from "@/shared/lib/gitlab/syntax/diff-syntax";
import type { SyntaxToken } from "@/shared/lib/syntax-highlight/shiki-highlighter";

const renderToken = (token: SyntaxToken, index: number) => {
  const style =
    token.color || token.fontStyle
      ? {
          color: token.color,
          fontStyle: token.fontStyle && token.fontStyle & 1 ? "italic" : undefined,
          fontWeight: token.fontStyle && token.fontStyle & 2 ? "bold" : undefined,
          textDecoration:
            token.fontStyle && token.fontStyle & 4 ? "underline" : undefined,
        }
      : undefined;

  return (
    <span key={index} style={style}>
      {token.content}
    </span>
  );
};

export const HighlightedCode = memo(
  ({
    tokens,
    fallback,
    gitlabSyntax = false,
  }: {
    tokens: SyntaxToken[] | null | undefined;
    fallback: string;
    gitlabSyntax?: boolean;
  }) => {
    const renderedTokens = useMemo(
      () =>
        gitlabSyntax && tokens
          ? mapTokensToGitlabDiffSyntax(tokens)
          : tokens,
      [gitlabSyntax, tokens],
    );

    if (!renderedTokens || renderedTokens.length === 0) {
      return <>{fallback || " "}</>;
    }

    return <>{renderedTokens.map(renderToken)}</>;
  },
);
