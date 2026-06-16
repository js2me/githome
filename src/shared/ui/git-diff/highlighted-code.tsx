import { memo } from "react";
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
  }: {
    tokens: SyntaxToken[] | null | undefined;
    fallback: string;
  }) => {
    if (!tokens || tokens.length === 0) {
      return <>{fallback || " "}</>;
    }

    return <>{tokens.map(renderToken)}</>;
  },
);
