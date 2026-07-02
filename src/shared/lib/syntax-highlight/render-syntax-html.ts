import { syntaxHighlighter } from "./syntax-highlighter";
import type { SyntaxToken } from "./syntax-highlighter";

export const renderSyntaxTokensToHtml = (lines: SyntaxToken[][]) =>
  syntaxHighlighter.renderTokensToHtml(lines);
