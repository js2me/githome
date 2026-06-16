import { resolveGitlabLanguage } from "./gitlab-lang";
import { renderSyntaxTokensToHtml } from "./render-syntax-html";
import {
  highlightCodeBlockTokens,
  type SyntaxTheme,
} from "./shiki-highlighter";

const stripInlineStyles = (root: ParentNode) => {
  for (const element of root.querySelectorAll("[style]")) {
    element.removeAttribute("style");
  }
};

export const enhanceMarkdownCodeBlocks = async (
  root: HTMLElement,
  theme: SyntaxTheme,
) => {
  const blocks = root.querySelectorAll<HTMLElement>(
    "pre.code, pre.highlight, pre.js-syntax-highlight, .markdown-code-block pre, pre > code",
  );

  const preElements = new Set<HTMLElement>();

  for (const block of blocks) {
    if (block.tagName === "CODE" && block.parentElement?.tagName === "PRE") {
      preElements.add(block.parentElement);
      continue;
    }

    if (block.tagName === "PRE") {
      preElements.add(block);
    }
  }

  for (const pre of preElements) {
    const code = pre.querySelector("code");
    if (!code) {
      continue;
    }

    const source = code.textContent ?? "";
    if (!source.trim()) {
      continue;
    }

    stripInlineStyles(pre);

    const lang = resolveGitlabLanguage(pre.className);
    if (!lang) {
      pre.classList.add("gitlab-markdown-plain-code");
      continue;
    }

    const lines = await highlightCodeBlockTokens(source, lang, theme);
    if (lines.length === 0) {
      pre.classList.add("gitlab-markdown-plain-code");
      continue;
    }

    code.innerHTML = renderSyntaxTokensToHtml(lines);
    pre.classList.add("gitlab-markdown-shiki-code");
    pre.dataset.shikiEnhanced = "true";
  }
};
