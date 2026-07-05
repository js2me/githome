import type { SyntaxToken } from "@/shared/lib/syntax-highlight/shiki-highlighter";

/** Diff использует нативные цвета Shiki-темы без remapping. */
export const mapTokensToGitlabDiffSyntax = (
  tokens: SyntaxToken[],
): SyntaxToken[] => tokens;
