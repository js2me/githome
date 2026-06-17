import type { SyntaxToken } from "@/shared/lib/syntax-highlight/shiki-highlighter";
import { cssColor } from "@/shared/lib/css-color";

/**
 * GitLab "white" pygments theme colors for diff code.
 * @see gitlab/app/assets/stylesheets/highlight/_white_base.scss
 */
const getGitlabWhite = () => {
  const colors = {
    default: cssColor("--syntax-default"),
    comment: cssColor("--syntax-comment"),
    string: cssColor("--syntax-string"),
    keyword: cssColor("--syntax-keyword"),
    type: cssColor("--syntax-type"),
    function: cssColor("--syntax-function"),
    number: cssColor("--syntax-number"),
    attr: cssColor("--syntax-attr"),
    literal: cssColor("--syntax-literal"),
  };

  return colors;
};

const getGithubToGitlabMap = () => {
  const GITLAB_WHITE = getGitlabWhite();

  return {
    ...Object.fromEntries(
      (
        [
          ["#24292e", GITLAB_WHITE.default],
          ["#953800", GITLAB_WHITE.function],
          ["#0550ae", GITLAB_WHITE.keyword],
          ["#0a3069", GITLAB_WHITE.string],
          ["#8250df", GITLAB_WHITE.function],
          ["#116329", GITLAB_WHITE.attr],
          ["#cf222e", GITLAB_WHITE.string],
          ["#6e7781", GITLAB_WHITE.comment],
          ["#6639ba", GITLAB_WHITE.function],
          ["#1f2328", GITLAB_WHITE.default],
          ["#57606a", GITLAB_WHITE.comment],
          ["#0969da", GITLAB_WHITE.literal],
          ["#7d8590", GITLAB_WHITE.comment],
          ["#d73a49", GITLAB_WHITE.keyword],
          ["#6f42c1", GITLAB_WHITE.type],
          ["#22863a", GITLAB_WHITE.attr],
          ["#032f62", GITLAB_WHITE.string],
          ["#e36209", GITLAB_WHITE.literal],
          ["#005cc5", GITLAB_WHITE.literal],
          ["#e6edf3", GITLAB_WHITE.default],
          ["#ffa657", GITLAB_WHITE.function],
          ["#ff7b72", GITLAB_WHITE.string],
          ["#79c0ff", GITLAB_WHITE.literal],
          ["#a5d6ff", GITLAB_WHITE.string],
          ["#d2a8ff", GITLAB_WHITE.type],
          ["#7ee787", GITLAB_WHITE.attr],
          ["#ffa198", GITLAB_WHITE.string],
          ["#8b949e", GITLAB_WHITE.comment],
          ["#f0883e", GITLAB_WHITE.literal],
          ["#a371f7", GITLAB_WHITE.function],
          ["#c9d1d9", GITLAB_WHITE.default],
        ] as const
      ).map(([from, to]) => [from.toLowerCase(), to]),
    ),
  } as Record<string, string>;
};

export const mapTokensToGitlabDiffSyntax = (
  tokens: SyntaxToken[],
): SyntaxToken[] => {
  const GITLAB_WHITE = getGitlabWhite();
  const GITHUB_TO_GITLAB = getGithubToGitlabMap();

  return tokens.map((token) => {
    const mappedColor =
      (token.color && GITHUB_TO_GITLAB[token.color.toLowerCase()]) ||
      token.color;

    const fontStyle = token.fontStyle ?? 0;
    const isComment = fontStyle & 1;

    return {
      ...token,
      color: isComment
        ? GITLAB_WHITE.comment
        : mappedColor || GITLAB_WHITE.default,
      fontStyle: isComment ? 1 : token.fontStyle,
    };
  });
};
