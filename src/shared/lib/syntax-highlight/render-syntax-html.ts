import type { SyntaxToken } from './syntax-highlighter';
import { syntaxHighlighter } from './syntax-highlighter';

export const renderSyntaxTokensToHtml = (lines: SyntaxToken[][]) =>
  syntaxHighlighter.renderTokensToHtml(lines);
