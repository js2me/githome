import {
  resolveSyntaxLanguage,
  type SyntaxLanguage,
} from "@/shared/lib/syntax-highlight/supported-languages";

export const resolveGitlabLanguage = (
  className: string,
): SyntaxLanguage | null => {
  const match = className.match(/\blanguage-([a-z0-9#+._-]+)/i);
  if (!match) {
    return null;
  }

  return resolveSyntaxLanguage(match[1]);
};
