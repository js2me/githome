import {
  SyntaxHighlighter,
  syntaxHighlighter,
} from "./syntax-highlighter";

export type {
  SyntaxLineTokens,
  SyntaxTheme,
  SyntaxToken,
} from "./syntax-highlighter";
export { SyntaxHighlighter, syntaxHighlighter };

export const highlightContentToLineTokens = (
  ...args: Parameters<SyntaxHighlighter["highlightContentToLineTokens"]>
) => syntaxHighlighter.highlightContentToLineTokens(...args);

export const highlightCodeBlockTokens = (
  ...args: Parameters<SyntaxHighlighter["highlightCodeBlockTokens"]>
) => syntaxHighlighter.highlightCodeBlockTokens(...args);

export const highlightLineText = (
  ...args: Parameters<SyntaxHighlighter["highlightLineText"]>
) => syntaxHighlighter.highlightLineText(...args);

export const highlightParsedDiffLines = (
  ...args: Parameters<SyntaxHighlighter["highlightParsedDiffLines"]>
) => syntaxHighlighter.highlightParsedDiffLines(...args);

export const preloadSyntaxHighlighter = () => syntaxHighlighter.preload();
