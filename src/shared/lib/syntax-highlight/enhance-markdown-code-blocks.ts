import { resolveGitlabLanguage } from "@/shared/lib/gitlab/syntax/lang";
import { renderSyntaxTokensToHtml } from "./render-syntax-html";
import { syntaxHighlighter, type SyntaxTheme } from "./syntax-highlighter";

const stripInlineStyles = (root: ParentNode) => {
  for (const element of root.querySelectorAll("[style]")) {
    element.removeAttribute("style");
  }
};

const waitForVisibility = (element: HTMLElement) =>
  new Promise<void>((resolve) => {
    if (typeof IntersectionObserver === "undefined") {
      resolve();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          observer.disconnect();
          resolve();
        }
      },
      {
        root: null,
        rootMargin: "240px 0px",
        threshold: 0,
      },
    );

    observer.observe(element);
  });

const enhanceCodeBlock = async (pre: HTMLElement, theme: SyntaxTheme) => {
  const code = pre.querySelector("code");
  if (!code || pre.dataset.shikiEnhanced === "true") {
    return;
  }

  const source = code.textContent ?? "";
  if (!source.trim()) {
    return;
  }

  stripInlineStyles(pre);

  const lang = resolveGitlabLanguage(pre.className);
  if (!lang) {
    pre.classList.add("gitlab-markdown-plain-code");
    return;
  }

  const lines = await syntaxHighlighter.highlightCodeBlockTokens(
    source,
    lang,
    theme,
  );
  if (lines.length === 0) {
    pre.classList.add("gitlab-markdown-plain-code");
    return;
  }

  code.innerHTML = renderSyntaxTokensToHtml(lines);
  pre.classList.add("gitlab-markdown-shiki-code");
  pre.dataset.shikiEnhanced = "true";
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

  await waitForVisibility(root);

  for (const pre of preElements) {
    await enhanceCodeBlock(pre, theme);
  }
};
