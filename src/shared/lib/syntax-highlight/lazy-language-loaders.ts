import { syntaxHighlighter } from "./syntax-highlighter";

export const isSupportedSyntaxLanguage = (lang: string): boolean =>
  syntaxHighlighter.isSupportedLanguage(lang);
